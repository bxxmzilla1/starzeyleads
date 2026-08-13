-- ====================================================================
-- Starzey — Supabase schema. Safe to re-run: tables use IF NOT EXISTS
-- and policies are dropped before being recreated.
-- ====================================================================

-- ---------- Tables ----------

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  eyebrow text not null default '',
  headline text not null default '',
  subtext text not null default '',
  bullets text not null default '',
  visits integer not null default 0,
  created_at timestamptz not null default now()
);

-- Upgrade for databases created before custom bullet points were added.
alter table public.tracking_links add column if not exists bullets text not null default '';

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  link_slug text,
  address text,
  timeline text,
  agent text,
  reason text,
  condition text,
  occupancy text,
  full_name text,
  phone text,
  email text,
  phone_valid boolean not null default false,
  country text,
  city text,
  ip text,
  created_at timestamptz not null default now()
);

-- Upgrades for databases created before geolocation was added.
alter table public.leads add column if not exists country text;
alter table public.leads add column if not exists city text;
alter table public.leads add column if not exists ip text;

-- Global landing page content, edited in the admin's "Landing page"
-- section. A single row (id = 1) that every tracking link applies
-- automatically.
create table if not exists public.landing_settings (
  id integer primary key default 1 check (id = 1),
  eyebrow text not null default '',
  headline text not null default '',
  subtext text not null default '',
  bullets text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.landing_settings (id, headline)
values (1, 'If your home is not sold in *30 days*, you don''t pay us — even after it sells')
on conflict (id) do nothing;

-- Backfill for rows created before the default headline was seeded,
-- so the admin editor shows the copy the page actually displays.
update public.landing_settings
set headline = 'If your home is not sold in *30 days*, you don''t pay us — even after it sells'
where id = 1 and headline = '';

-- Cleanup: the live-presence feature was removed.
drop table if exists public.presence;

-- One row per funnel step a visitor completes on the landing page.
-- session_id groups the events of a single visitor's attempt.
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  link_slug text not null,
  step_index integer not null,
  step text not null,
  value text,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_slug_idx
  on public.funnel_events (link_slug, created_at);

-- ---------- Row-level security ----------

alter table public.tracking_links enable row level security;
alter table public.leads enable row level security;
alter table public.funnel_events enable row level security;
alter table public.landing_settings enable row level security;

-- Landing settings: anyone may read (the public landing page needs
-- them), only signed-in users may edit.
drop policy if exists "public read landing settings" on public.landing_settings;
create policy "public read landing settings"
  on public.landing_settings for select
  using (true);

drop policy if exists "auth insert landing settings" on public.landing_settings;
create policy "auth insert landing settings"
  on public.landing_settings for insert to authenticated
  with check (true);

drop policy if exists "auth update landing settings" on public.landing_settings;
create policy "auth update landing settings"
  on public.landing_settings for update to authenticated
  using (true);

-- Tracking links: anyone may read (landing pages need the custom copy),
-- but only signed-in users may create/update/delete.
drop policy if exists "public read links" on public.tracking_links;
create policy "public read links"
  on public.tracking_links for select
  using (true);

drop policy if exists "auth insert links" on public.tracking_links;
create policy "auth insert links"
  on public.tracking_links for insert to authenticated
  with check (true);

drop policy if exists "auth update links" on public.tracking_links;
create policy "auth update links"
  on public.tracking_links for update to authenticated
  using (true);

drop policy if exists "auth delete links" on public.tracking_links;
create policy "auth delete links"
  on public.tracking_links for delete to authenticated
  using (true);

-- Leads: anyone may submit one (that's the whole funnel),
-- but only signed-in users may read or delete them.
drop policy if exists "public insert leads" on public.leads;
create policy "public insert leads"
  on public.leads for insert
  with check (true);

drop policy if exists "auth read leads" on public.leads;
create policy "auth read leads"
  on public.leads for select to authenticated
  using (true);

drop policy if exists "auth delete leads" on public.leads;
create policy "auth delete leads"
  on public.leads for delete to authenticated
  using (true);

-- Funnel events: anonymous visitors may record progress,
-- only signed-in users may read it.
drop policy if exists "public insert funnel events" on public.funnel_events;
create policy "public insert funnel events"
  on public.funnel_events for insert
  with check (true);

drop policy if exists "auth read funnel events" on public.funnel_events;
create policy "auth read funnel events"
  on public.funnel_events for select to authenticated
  using (true);

drop policy if exists "auth delete funnel events" on public.funnel_events;
create policy "auth delete funnel events"
  on public.funnel_events for delete to authenticated
  using (true);

-- ---------- Unique visit counter ----------
-- A visit only counts once per visitor (keyed by IP address, or a
-- per-device id when the IP can't be resolved). The security-definer
-- function is callable by anonymous visitors without granting them
-- any table rights; link_visits has no public policies at all.

create table if not exists public.link_visits (
  link_slug text not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  primary key (link_slug, visitor_key)
);

alter table public.link_visits enable row level security;

-- Admins may clear the dedupe rows when resetting a link's stats.
drop policy if exists "auth delete link visits" on public.link_visits;
create policy "auth delete link visits"
  on public.link_visits for delete to authenticated
  using (true);

-- Replace the old unconditional counter.
drop function if exists public.increment_visits(text);

create or replace function public.increment_visits(p_slug text, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or p_key is null or length(p_key) = 0 then
    return;
  end if;

  insert into public.link_visits (link_slug, visitor_key)
  values (p_slug, p_key)
  on conflict do nothing;

  -- FOUND is true only when the insert actually added a row,
  -- i.e. this visitor hasn't been counted for this link before.
  if found then
    update public.tracking_links set visits = visits + 1 where slug = p_slug;
  end if;
end;
$$;

grant execute on function public.increment_visits(text, text) to anon, authenticated;
