-- Rosewood Living — upgrade the leads table with the structured Letter of Intent
-- breakdown. Idempotent: safe to run on a fresh database, or on one that already
-- ran 0001 (including the earlier version that used a `project_type` column).
--
-- Apply: paste into the Supabase dashboard SQL editor and run, or `supabase db push`.

-- Ensure the table exists (minimal shape); 0001 creates the full version.
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_type  text not null,
  name       text not null,
  company    text not null,
  email      text not null,
  source     text not null default 'website'
);

-- Add every column the application writes, only if missing.
alter table public.leads
  add column if not exists role                  text,
  add column if not exists phone                 text,
  add column if not exists project_location      text,
  add column if not exists development_types     text,
  add column if not exists dwellings             text,
  add column if not exists project_stage         text,
  add column if not exists total_apartments      integer,
  add column if not exists affordable_apartments integer,
  add column if not exists boarding_rooms        integer,
  add column if not exists co_living_rooms       integer,
  add column if not exists serviced_apartments   integer,
  add column if not exists retail_area_sqm       integer,
  add column if not exists commercial_area_sqm   integer,
  add column if not exists message               text;

-- Backfill development_types from the legacy project_type column where present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'project_type'
  ) then
    update public.leads
      set development_types = project_type
      where development_types is null and project_type is not null;
  end if;
end$$;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_lead_type_idx on public.leads (lead_type);

alter table public.leads enable row level security;
