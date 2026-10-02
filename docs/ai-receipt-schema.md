# AI Receipt Schema

Gemini extracts; application code validates/calculates; user confirms.

Target fields: currency, items[name, quantity, unitPriceMinor, totalMinor], subtotalMinor, taxMinor, discountMinor, totalMinor, warnings.

Missing/uncertain values must not be invented. Backend validates types, non-negative prices, quantities, consistency, and output shape. Mobile lets user edit all extracted financial fields before calculation.
