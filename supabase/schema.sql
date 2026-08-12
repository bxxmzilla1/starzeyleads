-- ====================================================================
-- Starzey — Supabase schema. Run this once in the SQL Editor.
-- ====================================================================

-- ---------- Tables ----------

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  eyebrow text not null default '',
  headline text not null default '',
  subtext text not null default '',
  visits integer not null default 0,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

-- ---------- Row-level security ----------

alter table public.tracking_links enable row level security;
alter table public.leads enable row level security;

-- Tracking links: anyone may read (landing pages need the custom copy),
-- but only signed-in users may create/update/delete.
create policy "public read links"
  on public.tracking_links for select
  using (true);

create policy "auth insert links"
  on public.tracking_links for insert to authenticated
  with check (true);

create policy "auth update links"
  on public.tracking_links for update to authenticated
  using (true);

create policy "auth delete links"
  on public.tracking_links for delete to authenticated
  using (true);

-- Leads: anyone may submit one (that's the whole funnel),
-- but only signed-in users may read or delete them.
create policy "public insert leads"
  on public.leads for insert
  with check (true);

create policy "auth read leads"
  on public.leads for select to authenticated
  using (true);

create policy "auth delete leads"
  on public.leads for delete to authenticated
  using (true);

-- ---------- Atomic visit counter ----------
-- Callable by anonymous visitors without granting them update rights
-- on the table itself.

create or replace function public.increment_visits(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tracking_links set visits = visits + 1 where slug = p_slug;
$$;

grant execute on function public.increment_visits(text) to anon, authenticated;
