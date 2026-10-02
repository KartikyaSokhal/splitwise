# Architecture

## MVP boundary

React Native/Expo -> HTTPS -> Express API -> Gemini.

The app is guest and session-only in the 48-hour MVP. The mobile app owns presentation, local draft state, deterministic split calculation, and sharing. The backend owns Gemini credentials, receipt-upload validation, Gemini calls, and validation/normalization of AI output. No database, account, history, group, or payment flow is required to complete a bill.

Use one pure TypeScript money/split module as the source of truth for calculations. It must be unit-tested and callable from the mobile flow. `POST /api/split/calculate` is not required for MVP; do not duplicate calculator logic in an API merely for convenience.

## Core flow

Open without account -> enter a total -> add people -> choose equal or custom split -> review -> native share sheet.

This total-only manual flow is release-critical and works without camera, network, Gemini, or a backend. Itemized entry and item assignment are optional enhancements; they cannot block the total-only path.

## Receipt draft flow

Camera or image picker -> `POST /api/receipts/extract` -> Gemini -> backend schema and consistency validation -> editable bill draft -> user confirmation -> local split calculation.

Extraction never creates a final bill or final shares. Gemini/network/camera failures and rejected drafts show a safe error and a direct path to manual entry.

## Phase 2

Supabase PostgreSQL may be added for authenticated persistence, history, groups, and cross-device access. It is intentionally outside the MVP runtime path.
