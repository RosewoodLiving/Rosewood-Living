-- Rosewood Living — leads table
-- Serves BOTH forms via a `lead_type` discriminator. LOI-only project fields
-- are nullable so general enquiries can omit them. Writes happen server-side
-- with the service-role key, so RLS stays on with no public policies.
--
-- Apply: paste into the Supabase dashboard SQL editor and run, or use the
-- Supabase CLI (`supabase db push`).

create table if not exists public.leads (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  lead_type             text not null check (lead_type in ('general_enquiry', 'letter_of_intent')),
  name                  text not null,
  company               text not null,
  role                  text,
  email                 text not null,
  phone                 text,
  project_location      text,
  development_types     text,
  dwellings             text,
  project_stage         text,
  -- Structured project breakdown (Letter of Intent only)
  total_apartments      integer,
  affordable_apartments integer,
  boarding_rooms        integer,
  co_living_rooms       integer,
  serviced_apartments   integer,
  retail_area_sqm       integer,
  commercial_area_sqm   integer,
  message               text,
  source                text not null default 'website'
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_lead_type_idx on public.leads (lead_type);

-- RLS on, deny by default. The server uses the service-role key, which bypasses
-- RLS, so no anon/auth policies are needed (and none are granted on purpose).
alter table public.leads enable row level security;
