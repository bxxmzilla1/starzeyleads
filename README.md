# Starzey — Home Valuation Lead Funnel

A static, dependency-free PWA for capturing home valuation leads through
trackable landing pages.

## Pages

| URL | Purpose |
|---|---|
| `/` | Public landing page (7-step funnel). Reached via tracking links like `/?t=my-slug` |
| `/admin/` | Dashboard — links, visits, leads, conversion |
| `/admin/trackinglinks/` | Create/manage tracking links with per-link landing copy and a live preview |
| `/admin/leads/` | All captured leads, CSV export |

## Stack

Plain HTML/CSS/JS — no build step, no framework. Each section is its own
directory-based page so every route loads independently and fast. A service
worker (`sw.js`) precaches the shell and makes the app installable/offline-capable.

Fonts: Fraunces + Nunito Sans via Google Fonts (only external dependency).

## Data

All data (tracking links, visits, leads) currently lives in `localStorage`
via `assets/store.js`, which is written as a 1:1 mapping to future Supabase
tables (`tracking_links`, `leads`). Phone validation is simulated with a
`// TODO` marking where the Twilio Lookup API call goes.

Note: until the Supabase backend is wired in, leads submitted on a visitor's
device are stored in *their* browser only.

## Develop locally

Any static server from the repo root works, e.g.:

```bash
py -m http.server 4173
```

Then open http://localhost:4173 (landing) and http://localhost:4173/admin/.

## Deploy

Push to GitHub and import the repo in Vercel — no build settings needed
(framework preset: **Other**, no build command, output directory: root).
