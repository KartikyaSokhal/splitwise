# AGENTS.md

## Mission
Build a simple bill-splitting app whose core flow completes in under 30 seconds.

## Before coding
Read README.md and relevant docs in docs/. Do not silently change architecture or scope.

## Stack
React Native + Expo + TypeScript; Node.js + Express + TypeScript; Gemini API. Supabase PostgreSQL is a Phase 2 persistence option, not an MVP dependency.

## Product rules
- No mandatory login for MVP.
- Manual splitting always works without AI.
- The release-critical flow is total-only: total -> people -> equal/custom -> review -> native share sheet.
- AI output must be editable and validated.
- WhatsApp is only for sharing; it does not calculate bills.
- No payment processing in MVP.
- Keep screens simple.

## Money
Use integer minor units (paise), never floating-point final calculations. Final shares must sum exactly to total.

## AI/security
API keys stay on backend. Validate Gemini output against a schema. Never trust AI numbers silently. Provide manual fallback. Never log secrets or raw receipts unnecessarily.

## Git
Use feature/fix/chore/docs branches, not direct main development. Keep commits small. Use PRs and tests.

## Roles
Codex: tech lead, backend, integration, difficult bugs, final review.
Antigravity: UI/mobile implementation.
Gemini: receipt AI/prompt specialist and research.
Claude Code: independent QA, security and edge-case review.
Human: product/scope/merge decisions.

## Done means
Implementation + tests + error states + docs where needed + no secrets + clean commit/PR.
