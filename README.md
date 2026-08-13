# Starzey — Home Valuation Lead Funnel

A static, dependency-free PWA for capturing home valuation leads through
trackable landing pages.

## Pages

| URL | Purpose |
|---|---|
| `/` | Public landing page (2-step funnel: full name, phone). Reached via tracking links like `/?t=my-slug` |
| `/admin/` | Dashboard — links, visits, leads, conversion (sign-in required) |
| `/admin/trackinglinks/` | Create/manage tracking links and watch per-link funnel progress |
| `/admin/landingpage/` | Edit the landing page content (applies to every link) with a live desktop/mobile preview |
| `/admin/leads/` | All captured leads, CSV export |
| `/admin/login/` | Sign in / create account |

## Stack

Plain HTML/CSS/JS — no build step, no framework. Each section is its own
directory-based page so every route loads independently and fast. A service
worker (`sw.js`) precaches the shell and makes the app installable/offline-capable.

External dependencies: Google Fonts (Nunito Sans) and
`@supabase/supabase-js` v2 via CDN.

## Supabase setup (one time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/schema.sql`. This creates
   the `tracking_links` and `leads` tables, row-level security policies, and
   an `increment_visits()` function that counts each visit once per
   unique IP address per link.
3. Give the app your **Project URL** and **anon key** (Supabase → Project
   Settings → API). Two ways:
   - **Vercel (recommended):** Project Settings → Environment Variables, add
     `SUPABASE_URL` and `SUPABASE_ANON_KEY`, then redeploy. They're served
     to the pages by the `/api/config` serverless function.
   - **Local dev / other static hosts:** paste them into `assets/config.js`.
     The env-based config takes priority when both exist.

   The anon key is public by design — RLS controls access:
   - visitors can read landing copy, count a visit, and submit a lead
   - only signed-in users can read leads or manage links
4. Open `/admin/login/`, create your account, and sign in.

Note: any visitor who finds the login page can also create an account and
would then see your data. After creating your own account, disable new
sign-ups in Supabase (Authentication → Sign In / Up → toggle off
"Allow new users to sign up").

## Optional environment variables (Vercel)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase connection (served by `/api/config`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Real phone validation via the free Twilio Lookup v2 API (`/api/verify-phone`). Without them, every 10-digit number passes. Only Twilio-verified leads are shown in the admin. |
| `IPINFO_TOKEN` | IPinfo geolocation (`/api/geo`) — country and city are stored on each lead and shown in the admin. Works without a token within IPinfo's small free unauthenticated limits. |

## Develop locally

Any static server from the repo root works, e.g.:

```bash
py -m http.server 4173
```

Then open http://localhost:4173 (landing) and http://localhost:4173/admin/.

## Deploy

Push to GitHub and import the repo in Vercel — no build settings needed
(framework preset: **Other**, no build command, output directory: root).
