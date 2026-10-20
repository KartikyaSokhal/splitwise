# DueShare

Split a bill now. Keep a shared record when you need one.

```text
Enter total → Add people → Equal / Custom → Review → Native Share
```

Quick Split is guest-first and fully offline: no account, camera, AI or cloud connection required. Money uses exact integer paise (INR). Equal splits assign leftover paise in stable order; custom edits pin amounts and redistribute only the unpinned remainder. Nothing processes or verifies a money transfer.

## Optional saved groups

Google sign-in unlocks named groups with selectable purposes: General/Friends, Trip, Family, Home/Roommates, Car Pool, Couple, Office/Team, College Friends, Event and Other/Custom. Trip setup adds an optional destination and start/end dates. Every purpose uses the same secure expense, balance, repayment, member and history ledger; no separate Trip money engine exists. Groups support consent-based member invitations, multiple-payer expenses, balances, settlement suggestions, explicit repayment records and paginated history. Corrections preserve the original ledger. Guest bills are never automatically uploaded.

DueShare now uses a midnight/forest/mint visual theme and a two-path workflow—not a finance dashboard. Apple and phone sign-in, receipts, multi-currency, offline cloud sync and payments are deferred.

## Run locally

Use Node 26.5.0 (.nvmrc), with the locked dependencies:

```bash
cd mobile
npm ci
npm start
```

No environment configuration is needed for guest use. An October 20 custom iOS simulator rebuild contains the formerly missing `React.framework` and rendered Guest Home with cloud config disabled. The configured **unsigned** simulator build reached JavaScript but SecureStore reported a missing Keychain entitlement; signed-in/native Google acceptance is still unverified. See the local-only `docs/pr6-release-validation-2026-10-20.md`.

For cloud use, copy [the blank config example](mobile/.env.example) to an ignored local environment file. Supply the Supabase HTTPS project URL, public publishable key, callback scheme and your registered iOS/Android identifiers. Native/runtime/example defaults now agree on `dueshare`; confirm that exact callback is registered before OAuth testing, and rebuild after changing the scheme.

Enable Google through Supabase with a Google web OAuth client; its secret belongs only in the provider dashboard, never mobile code or Git. [Official Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google). No Apple, SMS, Gemini or payment credentials are needed for this build. Do not send credentials to chat.

## Verification snapshot — October 20, 2026

- 155 mobile tests (eight new after PR #6) and 33 PostgreSQL/PGlite tests (the prior 32 plus an explicit partial/exact repayment-direction regression) passed; 11 earlier isolated multi-connection PostgreSQL 17.11 tests were not rerun.
- TypeScript passed; online Expo Doctor passed 21/21 and Expo's dependency check passed after four SDK 57 patch updates and removal of invalid splash config. A Debug iOS simulator native build passed.
- Prior October 3 staging evidence: three additive migrations applied, 17 rollback-only SQL assertions and three anonymous HTTP denial checks passed; not rerun in this review.
- The custom build rendered Guest Home on iPhone 18 Pro/iOS 27 with cloud config disabled. Its full tap-through flow was not run this pass; October 14 Expo Go equal/custom/share observations remain historical. Configured unsigned build hit a Keychain entitlement error; small-iPhone and signed-in visual tests remain outstanding.
- Real Google/device flows, signed-in hosted JWT isolation and signed releases remain unverified.

Run npm test and npm run typecheck from mobile/. Run npm ci and npm test from supabase/ for database tests. Opt-in test:postgres requires an isolated local QA container; it never accepts a hosted database URL.

The October 20 mobile audit reports 23 affected dependency entries (16 high, seven moderate), principally inherited from three Expo/React Native build-tool advisories; no incompatible forced downgrade was applied. The release-fix branch adds read-only GitHub Actions checks for mobile tests, typecheck, Expo diagnostics and PGlite tests. PR #6 had already merged into master before this review; the release-fix PR must be reviewed separately. This is **not production certified**: signed native/provider/two-user acceptance, physical-device QA and account-deletion/retention work remain.

## Engineering boundaries

React Native 0.86 / Expo 57 / React 19 / TypeScript; local pure money engines; optional Supabase Auth/PostgreSQL. [Foundation](supabase/migrations/202610030001_secure_foundation.sql), [reads/retries](supabase/migrations/202610030002_app_reads_and_retries.sql) and [Group purposes/Trip metadata](supabase/migrations/202610030003_group_purposes_and_trips.sql) are applied to staging. Never rewrite applied migrations or reset a database to deploy changes.

User, financial Person and GroupMember are distinct. RLS and named RPCs enforce access; ordinary direct writes are denied. Financial writes are atomic/idempotent, exact amounts cross the read boundary as validated strings, and immutable corrections retain history. A pending save can be retried explicitly with its original key. Suggestions never automatically become payments.

Before public accounts: finish native/provider/two-user acceptance, dependency risk disposition, privacy/account-deletion/retention implementation and production operational review. Archive is not erasure; do not introduce deletion cascades.

Internal handoff: docs/MASTER_PROJECT_CONTEXT.md Sections 42–43 and pr6-release-validation-2026-10-20.md. **docs/ and AGENTS.md are intentionally ignored/local-only**, so distribute them separately to future engineering sessions.
