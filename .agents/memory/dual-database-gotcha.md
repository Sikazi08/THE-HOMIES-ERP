---
name: Dual-database gotcha (Supabase vs helium)
description: The app prefers SUPABASE_DATABASE_URL over DATABASE_URL — all schema/data work must target the Supabase DB.
---

The DB connection (`lib/db/src/index.ts`) uses `process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL`.

- `SUPABASE_DATABASE_URL` → Supabase pooler (`aws-1-eu-central-1.pooler.supabase.com:6543`). This is the **real, live** database the app reads/writes. Requires `ssl: { rejectUnauthorized: false }`.
- `DATABASE_URL` → host `helium`, the Replit-local Postgres. **Unused by the app.**

**Why:** Applying ALTERs/migrations to `DATABASE_URL` looks like it works (psql succeeds) but the running app never sees them — it connects to Supabase. A missing column then surfaces only as a masked drizzle 500 ("Failed query ... column does not exist") at runtime, not at migration time.

**How to apply:** For ANY schema or data work, target `$SUPABASE_DATABASE_URL`, e.g.
`psql "$SUPABASE_DATABASE_URL" -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..."`.
For enum values use separate single statements: `ALTER TYPE ... ADD VALUE IF NOT EXISTS '...'`.
To verify a query actually works for the app, run a drizzle probe against `SUPABASE_DATABASE_URL` (with the SSL option), not a fresh `DATABASE_URL` pool.
