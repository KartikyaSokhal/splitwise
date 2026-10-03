# DueShare

Split a bill now. Keep a shared record when you need one.

```text
Enter total → Add people → Equal / Custom → Review → Native Share
```

Quick Split is guest-first and fully offline: no account, camera, AI or cloud connection required. Money uses exact integer paise (INR). Equal splits assign leftover paise in stable order; custom edits pin amounts and redistribute only the unpinned remainder. Nothing processes or verifies a money transfer.

## Optional saved groups

Google sign-in unlocks named groups with selectable purposes: General/Friends, Trip, Family, Home/Roommates, Car Pool, Couple, Office/Team, College Friends, Event and Other/Custom. Trip setup adds an optional destination and start/end dates. Every purpose uses the same secure expense, balance, repayment, member and history ledger; no separate Trip money engine exists. Groups support consent-based member invitations, multiple-payer expenses, balances, settlement suggestions, explicit repayment records and paginated history. Corrections preserve the original ledger. Guest bills are never automatically uploaded.

DueShare uses its own indigo visual identity and a two-path workflow—not a finance dashboard. Apple and phone sign-in, receipts, multi-currency, offline cloud sync and payments are deferred.

## Run locally

Use Node 26.5.0 (.nvmrc), with the locked dependencies:

```bash
cd mobile
npm ci
npm start
```

No environment configuration is needed for guest use. Expo Go supports guest exploration; Google OAuth acceptance needs a custom native development/release build with registered app identifiers.

For cloud use, copy [the blank config example](mobile/.env.example) to an ignored local environment file. Supply the Supabase HTTPS project URL, public publishable key, callback scheme and your registered iOS/Android identifiers. Keep the existing split-auth://auth/callback scheme unless both the provider allowlist and native build are intentionally updated.

Enable Google through Supabase with a Google web OAuth client; its secret belongs only in the provider dashboard, never mobile code or Git. [Official Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google). No Apple, SMS, Gemini or payment credentials are needed for this build. Do not send credentials to chat.

## Verification snapshot — October 3, 2026

- 146 mobile tests; 32 PostgreSQL/PGlite tests; 11 earlier isolated multi-connection PostgreSQL 17.11 tests passed. Trip creation has not been rerun in the multi-connection harness.
- TypeScript, Expo compatibility/config and iOS/Android Hermes exports passed.
- Staging: three additive migrations applied, 17 rollback-only SQL assertions and three anonymous HTTP denial checks passed.
- iOS simulator guest split, custom pinning and share cancellation checked.
- Real Google/device flows, signed-in hosted JWT isolation and signed releases remain unverified.

Run npm test and npm run typecheck from mobile/. Run npm ci and npm test from supabase/ for database tests. Opt-in test:postgres requires an isolated local QA container; it never accepts a hosted database URL.

The fresh mobile dependency audit reports 24 affected package entries (17 high, seven moderate). Date-picker is counted through its existing Expo dependency, not a separate reported direct advisory; the suggested date-picker downgrade is incompatible with Expo 57's pinned version. Prior underlying advisories were in braces, node-forge and xcode's uuid. Dependency risk disposition remains a release gate; no forced downgrade was applied. Database test dependencies previously audited clean. This is a device-QA candidate, not production certification.

## Engineering boundaries

React Native 0.86 / Expo 57 / React 19 / TypeScript; local pure money engines; optional Supabase Auth/PostgreSQL. [Foundation](supabase/migrations/202610030001_secure_foundation.sql), [reads/retries](supabase/migrations/202610030002_app_reads_and_retries.sql) and [Group purposes/Trip metadata](supabase/migrations/202610030003_group_purposes_and_trips.sql) are applied to staging. Never rewrite applied migrations or reset a database to deploy changes.

User, financial Person and GroupMember are distinct. RLS and named RPCs enforce access; ordinary direct writes are denied. Financial writes are atomic/idempotent, exact amounts cross the read boundary as validated strings, and immutable corrections retain history. A pending save can be retried explicitly with its original key. Suggestions never automatically become payments.

Before public accounts: finish native/provider/two-user acceptance, dependency risk disposition, privacy/account-deletion/retention implementation and production operational review. Archive is not erasure; do not introduce deletion cascades.

Internal handoff: docs/MASTER_PROJECT_CONTEXT.md Section 40 and setup-and-handoff.md. **docs/ and AGENTS.md are intentionally ignored/local-only**, so distribute them separately to future engineering sessions. No commit or push was made during this handoff.
