# Testing

## Release-critical unit tests

Test minor-unit parsing/formatting, equal splits with odd paise, stable-order remainder assignment, zero totals, one person, and invalid person counts. For custom amounts, test exact reconciliation, shortfalls, overages, negative input rejection, and disabled confirmation while a remainder exists.

If item splitting is implemented, test complete and incomplete assignment, positive and negative bill-level adjustments, proportional rounding, no assigned items, tax, discounts, and the exact final-total invariant.

## Receipt and API tests

Test clear and blurry receipts, tax, discounts, quantities, unreadable images, and non-receipts. Test valid, malformed, inconsistent, and uncertain Gemini output. Test invalid, unexpected, oversized, and unsupported uploads; timeout/provider failure; rate limiting; and every documented API error envelope. Tests must verify no raw receipt or secret leaks into responses or logs.

## Mobile tests

Test the full offline total-only path, people editing/reordering, equal/custom review, sharing, permissions, loading/error states, receipt-draft editing/discarding, and the visible manual fallback.

Invariant: every confirmed split satisfies `sum(finalShareMinor) === totalMinor` exactly.
