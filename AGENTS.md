# AGENTS.md

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **Suivi efficace** (API base `https://55h7r6yk.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

## Session Summary — Security Audit & Hardening

### What was done

**Critical security fixes:**
- **Email XSS (functions/send-email):** Added `esc()` HTML-escaping function and applied to all user-supplied fields in `tplContact` (name, email, phone, address, message) to prevent email template injection
- **Abuse protection:** Removed `clearAbuseLogs()` / `clearAbuseLockout()` calls from `use-auth.tsx` that ran on every page load, which defeated abuse lockout. Abuse data is now only cleared on explicit successful sign-in
- **AI Widget:** Sanitized error messages — raw API error details (which could leak infrastructure info) replaced with generic user-facing messages
- **`login_failed` audit logging:** Added `logAudit({ action: "login_failed", ... })` emission in `SignInPage.tsx` catch block — previously the event type existed in the schema but was never actually emitted
- **Password policy:** Changed `insforge.toml` `min_length` from 6 → 8 to match client-side validation
- **`window.open` security:** Added `noopener` window feature in `GestionPage.tsx` receipt print function

**Activity & audit logging:**
- **EducationPage activity tracking:** Added `logActivity()` import and calls to all CRUD operations (student, teacher, class, payment, exam create/update/delete) — this module was missing all logging that other modules (Pharmacy, Commerce, Gestion) already had
- **HR leave approval audit:** Added `logAudit()` calls when leave requests are approved or rejected — updates `audit.ts` `AuditAction` type with `leave_approved` / `leave_rejected`
- **Connected devices label:** Changed misleading static "1 appareil" / "1 device" badge to "Session active" / "Active session"

**Latest commit:**
- `21896db` — `fix: production audit — CSRF, IDOR, missing migrations, password i18n, validation`

**GitHub:** All changes pushed
