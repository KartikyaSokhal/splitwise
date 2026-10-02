# Security

## Trust boundary

The mobile app is untrusted. Gemini credentials live only in backend environment variables; never place Gemini, Supabase service-role, or deployment secrets in mobile code, commits, client logs, or error responses. Supabase is not configured for the MVP.

Receipt images cross the mobile-to-backend boundary only for extraction. The backend validates the multipart field name, MIME type using file signatures where feasible, file size, image dimensions, and request body before sending anything to Gemini. Reject unexpected fields and unsupported content. Configure centrally: exactly one image, a 10 MB maximum file size, a 12-megapixel maximum decoded image, and a 15-second extraction timeout. Return the documented safe error format.

## Data handling

Do not permanently store raw receipts for MVP. Process uploads in memory or temporary storage with prompt cleanup; do not include image bytes, OCR text, raw Gemini output, tokens, or secrets in logs. Log only minimal operational metadata such as request outcome, error code, latency, and a privacy-safe request identifier.

## Service boundary

Apply body/upload limits, a production CORS allowlist, HTTPS at the deployment edge, and per-IP rate limiting before public access. Start with no more than 10 extraction requests per IP per 15 minutes, with an environment-configured limit for operational adjustment. Validate every request and every Gemini response with schemas and bounds. Return only the API error envelope; keep provider diagnostics and stack traces server-side.

The user review screen remains a safety boundary: AI-generated values are a draft and must be editable before a split is confirmed.
