-- Rosewood Living — leads table
-- Serves BOTH forms via a `lead_type` discriminator. LOI-only project fields
-- are nullable so general enquiries can omit them. Writes happen server-side
-- with the service-role key, so RLS stays on with no public policies.
--
-- Apply: paste into the Supabase dashboard SQL editor and run, or use the
-- Supabase CLI (`supabase db push`).

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  lead_type        text not null check (lead_type in ('general_enquiry', 'letter_of_intent')),
  name             text not null,
  company          text not null,
  role             text,
  email            text not null,
  phone            text,
  project_location text,
  project_type     text,
  dwellings        text,
  project_stage    text,
  message          text,
  source           text not null default 'website'
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_lead_type_idx on public.leads (lead_type);

-- RLS on, deny by default. The server uses the service-role key, which bypasses
-- RLS, so no anon/auth policies are needed (and none are granted on purpose).
alter table public.leads enable row level security;
