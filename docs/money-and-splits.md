# Money and Split Rules

## Money representation

All monetary values are signed integer minor units. For INR, one rupee is `100` paise. Inputs may be displayed as decimal currency but must be parsed into minor units before calculation; accept at most two fractional digits and reject more precise input rather than rounding it implicitly. Never use floating point for persisted or final values.

For the MVP, accept non-negative bill totals and share amounts only. A bill total of zero is valid only when every final share is zero. Currency is `INR` for launch; do not imply multi-currency conversion support.

## Equal split

For `totalMinor = T` and `n > 0` people:

- `base = floor(T / n)`.
- `remainder = T mod n`.
- Each person receives `base`.
- Give one additional paise to the first `remainder` people in the stable order displayed in the review screen.

The stable order is the order in which people were added unless the user explicitly reorders them. This makes rounding visible and repeatable. Final shares always sum exactly to `T`.

## Custom split

The MVP supports custom amounts, not percentages. Each active person has a non-negative integer `shareMinor`.

- Require at least one person.
- Reject a draft unless the sum of custom amounts equals `totalMinor` exactly.
- Do not silently redistribute a shortfall or overage.
- Show the remaining amount (positive or negative) while editing and disable confirmation until it is zero.

## Item split (optional enhancement)

Item splitting is not release-critical. Do not ship it unless these rules and their UI are implemented together:

- Item line totals and each assignment are integer minor units.
- Every item total must be assigned exactly, or the UI must require an explicit unassigned-person allocation.
- Allocate the absolute bill-level adjustment `abs(totalMinor - sum(itemTotalMinor))` across people in stable person order, proportional to each person's assigned item subtotal. If no one has assigned items, allocate it equally using the equal-split remainder rule.
- For a proportional allocation, use floor division for each person's adjustment and distribute leftover paise in stable person order among people with assigned items. Add the resulting allocation for a positive adjustment; subtract it for a negative adjustment.
- The final shares must sum exactly to `totalMinor`.

Tax, discounts, service charges, and tips are represented in the bill adjustment. The UI must display the resulting allocation; it must never be hidden inside AI output.

## Required invariant

For every confirmed split, `sum(finalShareMinor) === totalMinor`. Reject invalid inputs rather than compensating silently.
