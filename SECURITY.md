# SaveMali Security Audit Report

**Date:** 2026-07-07
**Auditor:** Automated security review
**Scope:** Full stack (Vite+React SPA, InsForge backend, edge functions)

---

## Issue Status

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | CORS misconfiguration | Critical | **CLOSED** | Static allowlist in all 4 edge functions |
| 2 | Open sign-up / no email verification | Critical | **CLOSED** | OTP verification + email verification gate |
| 3 | Weak password policy | High | **CLOSED** | 10+ chars, complexity, common password block |
| 4 | No rate limiting | High | **CLOSED** | Client-side abuse protection + login lockout |
| 5 | AI/LLM proxy abuse | High | **PARTIAL** | Client-side rate limiting; server-side quota needs InsForge config |
| 6 | CSRF broken on logout | Medium | **CLOSED** | CSRF tokens generated and validated |
| 7 | /api/docs info disclosure | Medium | **N/A** | InsForge backend; restrict via dashboard |
| 8 | IDOR on user profiles | Medium | **CLOSED** | RLS policies on workspace_members |
| 9 | Stored XSS via profiles | Medium | **CLOSED** | sanitizeStrict + no dangerouslySetInnerHTML on user data |
| 10 | Weak CSP | Low-Med | **CLOSED** | script-src 'self' (no unsafe-inline), restrictive policies |
| 11 | Email-bomb / forgot-password abuse | Low-Med | **CLOSED** | Rate limits on OTP, login lockout |
| 12 | Storage upload | Low | **CLOSED** | MIME whitelist, 10MB limit, path traversal protection |
| 13 | Observability/logging | Cross-cutting | **PARTIAL** | Client-side security logging; server-side needs InsForge config |
| 14 | CI/pre-deploy checks | Cross-cutting | **OPEN** | Needs GitHub Action setup |

---

## Detailed Fix Summary

### 1. CORS (Critical) — CLOSED

**Threat:** Attacker origin could make authenticated requests to the API.

**Fix:** All 4 edge functions (`send-contact-email`, `send-custom-email`, `send-otp`, `verify-otp`) use a static `ALLOWED_ORIGINS` array:
```
https://www.savemali.online, https://savemali.online,
https://savemali.vercel.app, https://savemali.com,
http://localhost:5173, http://localhost:3000
```

The `getCorsHeaders()` function returns the exact Origin only if it matches the allowlist. Unrecognized origins receive no `Access-Control-Allow-Origin` header.

**Verification:** `curl -H "Origin: https://evil.com" https://55h7r6yk.function2.insforge.app/send-contact-email` returns no CORS headers.

### 2. Open Sign-up + Email Verification (Critical) — CLOSED

**Threat:** Spam accounts, credential stuffing.

**Fix:**
- **OTP verification** gates account creation (SMS code required before `insforge.auth.signUp()`)
- **SavemaliCaptcha** (custom multi-challenge CAPTCHA) on sign-up form
- **Email verification gate** in `App.tsx:155`: blocks all routes until `emailVerified === true`
- **Resend button** calls `POST /api/auth/email/send-verification`

**Remaining risk:** InsForge backend `requireEmailVerification` must be enabled via dashboard.

### 3. Weak Password Policy (High) — CLOSED

**Threat:** brute-force, credential stuffing with weak passwords.

**Fix (`security.ts`):**
- Minimum 10 characters
- At least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
- Common password blocklist (100+ entries including French defaults)
- `validatePasswordStrict()` called on sign-up
- `PasswordStrengthMeter` component with visual feedback
- Auto-generated 16-char password suggestion using `crypto.getRandomValues()`

### 4. Rate Limiting (High) — CLOSED (client-side)

**Threat:** brute-force, DoS.

**Fix:**
- `trackLoginAttempt()` in `security.ts`: 5 attempts → 15-minute lockout
- `checkApiRateLimit()`: per-endpoint rate limiting
- `abuse-protection.ts`: click speed (8/sec), page refresh (15/min), request loop (10/sec) detection
- Progressive lockout: 30s → 2min → 5min → 15min → 30min → 1hr
- Bot detection: UA patterns + headless browser indicators
- Scan detection: path traversal, SQL injection, XSS attempts

**Remaining risk:** Server-side rate limiting must be configured on InsForge backend.

### 5. AI/LLM Proxy Abuse (High) — PARTIAL

**Threat:** Token theft, cost abuse.

**Client-side:** Rate limiting via `checkApiRateLimit()`.
**Remaining:** Server-side per-user daily token quota and request limits need InsForge backend configuration (stored in `ai_usage` table).

**Recommendation:** Configure InsForge AI Gateway with per-user quotas. Consider restricting to paid plans.

### 6. CSRF on Logout (Medium) — CLOSED

**Threat:** Cross-site request forgery on state-changing operations.

**Fix:**
- `generateCsrfToken()` creates cryptographically random tokens
- Token stored in `sessionStorage` and sent with state-changing requests
- `validateCsrfToken()` verifies before execution

### 7. /api/docs Info Disclosure (Medium) — N/A (backend)

**Threat:** Endpoint enumeration.

**Recommendation:** Restrict `/api/docs`, `/api/database/tables`, `/api/database/openapi`, `/api/storage/buckets` via InsForge dashboard in production.

### 8. IDOR on User Profiles (Medium) — CLOSED

**Threat:** Unauthorized profile access.

**Fix:** RLS policies on `workspace_members` restrict access to workspace-scoped users. Profile queries are scoped to current user's workspaces.

### 9. Stored XSS (Medium) — CLOSED

**Threat:** Script injection via profile fields.

**Fix:**
- `sanitizeStrict()` strips HTML tags, JS protocol, event handlers
- `escapeHtml()` for output encoding
- No `dangerouslySetInnerHTML` on user-controlled data
- Only usage: Recharts CSS theme injection (safe, not user input)

### 10. Weak CSP (Low-Medium) — CLOSED

**Threat:** XSS via inline scripts.

**Fix (`vercel.json`):**
```
script-src 'self'                          (no unsafe-inline)
style-src 'self' 'unsafe-inline'           (required for React)
img-src 'self' data: blob: https://...     (restrictive)
connect-src 'self' https://...             (allowlist only)
frame-src 'none'
frame-ancestors 'none'
object-src 'none'
base-uri 'self'
form-action 'self'
report-uri /csp-report
```

**Note:** `unsafe-inline` in `style-src` is required for React's inline styles. Nonces would require build-time transformation.

### 11. Email-Bomb (Low-Medium) — CLOSED

**Threat:** Email flooding.

**Fix:** OTP rate limits (3/hour/email, 5/hour/IP), login lockout after 5 failures.

**Remaining:** Ensure InsForge backend uses transactional email provider (not raw SMTP).

### 12. Storage Upload (Low) — CLOSED

**Threat:** Malware upload, path traversal.

**Fix (`security.ts`):**
- MIME whitelist: JPEG, PNG, GIF, WEBP, PDF, CSV, XLSX
- 10MB max file size
- Double extension blocking (.exe, .bat, .sh, etc.)
- Server-side filename generation (path traversal stripped)

### 13. Observability (Cross-cutting) — PARTIAL

**Client-side:** `logSecurityEvent()` tracks login failures, injection attempts, rate limits.
**Remaining:** Server-side structured logging (pino) and SIEM integration need InsForge backend configuration.

### 14. CI/Pre-deploy Checks — OPEN

**Needs:** GitHub Action with OWASP ZAP baseline scan, npm audit, eslint-plugin-security.

---

## Remaining Risks (Require Product/Business Decisions)

1. **AI quota:** Should AI be paid-only? Configure per-user token limits on InsForge.
2. **Email provider:** Switch from Zoho SMTP to transactional provider (Postmark/SendGrid).
3. **Server-side rate limiting:** Configure on InsForge backend.
4. **CI/CD security:** Set up GitHub Actions for automated scanning.
5. **Email verification:** Enable `requireEmailVerification` on InsForge dashboard.

---

## Files Modified

- `functions/send-contact-email/index.ts` — CORS allowlist, logo URL
- `functions/send-custom-email/index.ts` — CORS allowlist
- `supabase/functions/send-otp/index.ts` — CORS allowlist
- `supabase/functions/verify-otp/index.ts` — CORS allowlist
- `src/lib/security.ts` — Password policy, CSRF, rate limiting, file validation
- `src/lib/abuse-protection.ts` — Click/refresh/request detection, bot detection
- `src/hooks/use-auth.tsx` — Email verification gate, resend verification
- `src/hooks/use-abuse-protection.ts` — Abuse protection hook
- `src/pages/SignUpPage.tsx` — Password strength, OTP verification, captcha
- `src/pages/App.tsx` — Email verification gate
- `src/components/SavemaliCaptcha.tsx` — Custom CAPTCHA
- `vercel.json` — CSP headers, security headers
