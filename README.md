# Split

A fast, guest-first, offline-capable bill-splitting mobile app. Its core flow is designed to complete in under 30 seconds:

```text
Enter Total → Add People → Equal / Custom Split → Review → Native Share
```

---

## What is Split?

Split is built for simplicity, speed, and mathematical accuracy:
- **No account required**: Anyone can open the app and split a bill immediately without creating an account or logging in.
- **Offline-capable**: Runs entirely on-device; no network or cloud connection needed for manual splits.
- **Paise-accurate**: All money is represented in integer paise (1 INR = 100 paise), eliminating floating-point rounding errors. Final shares always sum exactly to the bill total.
- **Deterministic remainder distribution**: Odd paise in equal splits are assigned deterministically to the first participants in stable order.
- **Custom split with pinning**: Manually editing a participant's amount pins that participant. The remaining amount redistributes automatically across unpinned members upon commit. Pinned amounts are strictly protected.
- **Native sharing**: Instant export to WhatsApp, Messages, Mail, or any messaging app via the platform native share sheet.

---

## Current Status

- **Phase 0 (Quick Split MVP + Custom Split Pinning)**: **COMPLETED**
- **Automated Tests**: **41 passed**, 0 failed (`npm test`)
- **TypeScript**: 0 type errors (`npm run typecheck`)
- **Manual Verification**: Verified on physical iPhone (iOS Expo Go)

---

## Tech Stack

### Currently Implemented (Quick Split)
- **Mobile Client**: React Native 0.86, Expo 57, React 19, TypeScript
- **Calculation Engine**: Local, pure TypeScript integer paise engine (zero network/cloud runtime dependencies)
- **Sharing**: React Native native `Share` API

### Standalone / Planned Services
- **Receipt Extraction Service (Standalone)**: Node.js, Express, TypeScript, Gemini Vision API (backend-mediated)
- **Cloud Persistence & Auth (Planned for Phases 2–3)**: Supabase PostgreSQL, Supabase Auth (Google & Apple OAuth)

---

## Quick Start

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Run locally
```bash
npm start
```
Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

### 3. Run verification
```bash
npm test
npm run typecheck
```

---

## High-Level Roadmap

- **Phase 0**: Quick Split MVP + Custom Split Pinning *(Completed)*
- **Phase 1**: Pure TypeScript Multi-Payer Expense & Greedy Settlement Engine *(Next)*
- **Phase 2**: Authentication Foundation (Google + Apple sign-in via Supabase Auth)
- **Phase 3**: Cloud Persistence + Groups + Row Level Security (RLS)
- **Phase 4**: Trip Experience (Group with travel metadata, timeline, settle-up)
- **Phase 5**: History & Cross-Device Sync
- **Phase 6**: Receipt AI Integration into Groups
- **Phase 7**: Advanced Group Templates & UPI Features
