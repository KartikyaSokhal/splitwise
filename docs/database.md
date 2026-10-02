# Database Design (Phase 2)

No database is needed for the 48-hour MVP: a bill exists only in local session state until it is shared. Do not add Supabase configuration, migrations, authentication, or persistence UI to the MVP.

When persistence is approved, Supabase PostgreSQL can use this relational starting point:
- users(id, created_at)
- people(id, display_name, created_at)
- groups(id, name, created_at)
- group_members(group_id, person_id)
- bills(id, group_id, currency, subtotal_minor, tax_minor, discount_minor, total_minor, created_at)
- bill_items(id, bill_id, name, quantity, unit_price_minor, total_minor)
- item_assignments(item_id, person_id, share_minor)

Use UUIDs, foreign keys, deliberate delete rules, integer minor units for money, and least-privilege RLS when persistence is enabled. Define tenant ownership and deletion/retention behavior before exposing any persisted bills.
