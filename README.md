# Starzey — Home Valuation Lead Funnel

A static, dependency-free PWA for capturing home valuation leads through
trackable landing pages.

## Pages

| URL | Purpose |
|---|---|
| `/` | Public landing page (7-step funnel). Reached via tracking links like `/?t=my-slug` |
| `/admin/` | Dashboard — links, visits, leads, conversion (sign-in required) |
| `/admin/trackinglinks/` | Create/manage tracking links with per-link landing copy and a live preview |
| `/admin/leads/` | All captured leads, CSV export |
| `/admin/login/` | Sign in / create account |

## Stack

Plain HTML/CSS/JS — no build step, no framework. Each section is its own
directory-based page so every route loads independently and fast. A service
worker (`sw.js`) precaches the shell and makes the app installable/offline-capable.

External dependencies: Google Fonts (Fraunces + Nunito Sans) and
`@supabase/supabase-js` v2 via CDN.

## Supabase setup (one time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/schema.sql`. This creates
   the `tracking_links` and `leads` tables, row-level security policies, and
   an `increment_visits()` function for anonymous visit counting.
3. In Project Settings → API, copy the **Project URL** and **anon key** into
   `assets/config.js`. The anon key is safe to commit — RLS controls access:
   - visitors can read landing copy, count a visit, and submit a lead
   - only signed-in users can read leads or manage links
4. Open `/admin/login/`, create your account, and sign in.

Note: any visitor who finds the login page can also create an account and
would then see your data. After creating your own account, disable new
sign-ups in Supabase (Authentication → Sign In / Up → toggle off
"Allow new users to sign up").

Phone validation is still simulated with a `// TODO` marking where the
Twilio Lookup API call goes.

## Develop locally

Any static server from the repo root works, e.g.:

```bash
py -m http.server 4173
```

Then open http://localhost:4173 (landing) and http://localhost:4173/admin/.

## Deploy

Push to GitHub and import the repo in Vercel — no build settings needed
(framework preset: **Other**, no build command, output directory: root).
