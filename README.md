# Split

A fast, offline-first bill-splitting mobile app. Its core flow is designed to finish in under 30 seconds:

```text
Enter total → Add people → Equal or custom split → Review → Share
```

## MVP features

- No account, payment flow, database, or backend required for manual splits.
- INR amounts are calculated in integer paise, so final shares always add up exactly.
- Equal splits distribute leftover paise deterministically.
- Custom splits require the entered amounts to reconcile exactly before continuing.
- Share a clear summary through the native mobile share sheet, including WhatsApp when installed.
- Local state, validation, Android back navigation, and a fresh-bill reset flow.

Receipt scanning, Gemini extraction, item splitting, persistence, groups, history, authentication, and payments are intentionally outside this MVP.

## Tech stack

- React Native + Expo + TypeScript
- React Native native Share API
- Node.js, Express, Gemini, and Supabase/PostgreSQL are planned only for later receipt and persistence work

## Run locally

```bash
cd mobile
npm install
npm start
```

To launch a platform target:

```bash
npm run android
npm run ios
```

## Verify

```bash
cd mobile
npm test
npm run typecheck
npm exec expo config -- --type public
```

## Project structure

```text
mobile/
├── src/components/    # Reusable UI components
├── src/screens/       # MVP screens
├── src/state/         # Local bill state and split derivation
├── src/utils/         # Money, split, and sharing utilities
└── src/tests/         # Flow validation tests
```

## Money rules

Amounts are stored as integer INR paise. For example, ₹1,000 split equally between three people becomes ₹333.34, ₹333.33, and ₹333.33. The first person in stable order receives any remainder paise.
