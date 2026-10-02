# API Contract

All API responses are JSON and use `Content-Type: application/json`, except the multipart upload request. Monetary fields are integer minor units; in INR, `32000` means Rs. 320.00.

## `POST /api/receipts/extract`

Request: `multipart/form-data` with exactly one `receipt` image field. The backend accepts only configured image MIME types and applies the limits in `security.md` before calling Gemini.

Success (`200`):

```json
{
  "success": true,
  "draft": {
    "currency": "INR",
    "items": [{"name": "Paneer Tikka", "quantity": 1, "unitPriceMinor": 32000, "totalMinor": 32000}],
    "subtotalMinor": 32000,
    "taxMinor": 1600,
    "discountMinor": 0,
    "totalMinor": 33600
  },
  "warnings": []
}
```

`draft` is editable, unconfirmed data only. `items` may be empty. Unknown or uncertain values must be omitted or listed in `warnings`, never guessed. The backend may reject a malformed or materially inconsistent Gemini response rather than returning a partial financial result.

## Error format

Every non-2xx response has this shape:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_UPLOAD",
    "message": "Upload a supported image under the size limit.",
    "retryable": false
  }
}
```

`message` is safe for users and must not expose provider details, credentials, raw receipt contents, or stack traces. Supported codes and status codes are: `INVALID_UPLOAD` (`400`), `PAYLOAD_TOO_LARGE` (`413`), `UNSUPPORTED_MEDIA_TYPE` (`415`), `RATE_LIMITED` (`429`), `EXTRACTION_UNAVAILABLE` (`502`), `INVALID_EXTRACTION` (`502`), and `INTERNAL_ERROR` (`500`). `RATE_LIMITED` and `EXTRACTION_UNAVAILABLE` are retryable; `INTERNAL_ERROR` may be retryable.

There is no MVP split-calculation endpoint. The mobile app uses the tested deterministic calculator described in `money-and-splits.md`.
