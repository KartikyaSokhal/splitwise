# Architecture

React Native/Expo -> HTTPS -> Express API -> Gemini and Supabase PostgreSQL.

Mobile owns presentation and interaction. Backend owns secrets, external AI calls, validation, and trusted business logic. Database is initially optional for persistence; do not add history just because a DB exists.

Receipt flow: camera -> POST /api/receipts/extract -> Gemini -> schema validation -> normalized bill -> editable UI -> user confirmation.

If Gemini/network/camera fails, manual entry remains available.
