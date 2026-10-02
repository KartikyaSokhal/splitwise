# Product

## Promise
Split any bill in under 30 seconds.

## MVP flow
Open without account -> enter total -> add people -> Equal or Custom split -> review -> native share sheet.

The total-only manual path is the launch requirement. It must work without a camera, network connection, Gemini, or an account. WhatsApp is an intended share destination, but sharing uses the native platform sheet.

Receipt scan and itemized splitting are optional enhancements. If present, they must offer a visible manual-entry escape hatch at every failure point.

## Receipt flow
Capture or choose image -> backend -> Gemini extraction -> validate -> editable draft -> user confirms/edits -> local split.

The user can edit or discard every extracted financial field. A draft is never a confirmed bill until the user reviews it.

## Non-goals
Payments, mandatory login, persistence/history, groups, analytics, bank integrations, recurring household expenses, merchant integrations, and direct WhatsApp integration.

## Later
Supabase persistence/history, groups, trips, login, recurring expenses, UPI links, advanced reports.
