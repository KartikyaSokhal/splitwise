# AI Receipt Draft Contract

Gemini extracts a draft; application code validates and calculates; the user confirms. Gemini must be asked for structured JSON matching the target shape, but model output is untrusted until backend validation succeeds.

Target draft fields:

- `currency`: `INR` for MVP.
- `items`: optional array of `name`, `quantity`, `unitPriceMinor`, and `totalMinor`.
- `subtotalMinor`, `taxMinor`, `discountMinor`, and `totalMinor`.
- `warnings`: missing, uncertain, or unreadable fields.

All present monetary values are integer minor units. `quantity` is a positive number; it may be fractional only when the receipt clearly indicates a fractional quantity. Names are non-empty trimmed strings. Monetary values are non-negative except `discountMinor`, which represents the absolute discount amount and is therefore non-negative.

The backend validates JSON shape, types, bounds, fields, and arithmetic consistency. A draft with both subtotal and total must satisfy `totalMinor = subtotalMinor + taxMinor - discountMinor` unless a warning identifies an explicitly unsupported adjustment. An item with both unit price and quantity must match its line total within a documented integer-minor-unit rounding tolerance. The backend rejects materially inconsistent output with `INVALID_EXTRACTION`; it does not invent or silently repair money values.

Missing or uncertain values must be omitted or reported in `warnings`, never invented. Mobile displays the result as an editable draft and lets the user edit, discard, or replace every financial field before calculation. No extraction response is a confirmed bill, a final allocation, or a payment instruction.
