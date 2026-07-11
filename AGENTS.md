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

## Session Summary — Settings Overhaul + Audit

### What was done

**Dynamic WelcomeMessage component:**
- Extracted welcome banner from `DashboardLayout.tsx` into standalone `WelcomeMessage.tsx`
- Added workspace-type-specific tips (expiry alerts, pending leave, etc.)
- Shows current date, user name, dynamic insight per workspace type
- Cleaner interface with Sparkle icon and notification count pill

**Settings redesign (Stripe/Shopify-grade UX):**
- **Search bar:** Instant filter across all settings sections (filters sidebar groups live)
- **Reorganized categories:** Mon compte (Profile + Language), Préférences (Appearance + Notifications), Sécurité (Security + Privacy), Organisation (Workspace + Team + API + Backups + Billing), Système (Activity Log + Service Health)
- **New sections:**
  - Confidentialité (Privacy): Export my data, Delete account, Connected devices
  - Activity Log: Recent actions with timestamps
  - Service Health: Status cards for DB, API, Storage, Auth, Notifications
- **Sidebar grouped** with section headers and filtered by search query
- **Premium card styling:** Hover effects, icon containers, consistent spacing

**Bug fixes from comprehensive audit:**
- 32 `console.error` calls in user-facing paths converted to `toast.error` (RoleDashboard, ReportPreviewModal, ReportGenerator, HRPage, SecurityDashboardPage, SettingsPage)
- 26 empty `catch {}` blocks fixed with error logging across 13 files
- `any` type usage in SettingsPage replaced with proper interfaces (`MemberData`, `UserSettingsData`, `ApiKeyData`, `TeamMemberData`, `NotifConfig`)

**Latest commits:**
- `49f34ed` — `feat: settings overhaul, WelcomeMessage, search, privacy/system sections, audit fixes`
- `3d7b860` — `refine: premium logo, theme readability, responsive tables, schema cache DDL`
- `c7071c7` — `fix: route reduced_motion save to user_settings with upsert`
- `5466fcc` — `fix: auth loading screen also shows real SaveMali logo`
- `f886f85` — `fix: schema cache, upload fallback, loading screen real logo`

**GitHub:** All changes pushed (latest: `49f34ed`)
