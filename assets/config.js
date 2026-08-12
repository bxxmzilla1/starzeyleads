/* ====================================================================
 * Starzey — Supabase configuration (local/fallback).
 *
 * In production on Vercel, set the SUPABASE_URL and SUPABASE_ANON_KEY
 * environment variables instead — they're served by /api/config and
 * take priority over this file.
 *
 * For local development (or hosts without serverless functions):
 * 1. Create a free project at https://supabase.com
 * 2. Run supabase/schema.sql in the SQL Editor (one time)
 * 3. Paste your project URL and anon key below
 *    (Project Settings -> API). The anon key is public by design —
 *    row-level security in the schema controls what it can do.
 * ================================================================== */
window.STARZEY_CONFIG = window.STARZEY_CONFIG || {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY"
};
