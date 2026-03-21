-- Expands opportunities table to persist all fields from Create Opportunity form.
-- Safe to run multiple times.

alter table if exists public.opportunities
  add column if not exists contact_person text,
  add column if not exists contact text,
  add column if not exists description text,
  add column if not exists vat text,
  add column if not exists submitted_amount numeric,
  add column if not exists updated_at timestamptz default now();

-- Keep identifier fields reliable.
alter table if exists public.opportunities
  alter column opportunity_id set not null,
  alter column base_code set not null,
  alter column project_name set not null,
  alter column client_name set not null,
  alter column location set not null,
  alter column version set not null,
  alter column status set not null,
  alter column estimated_amount set not null,
  alter column created_at set not null;

-- Enforce uniqueness for generated IDs.
create unique index if not exists opportunities_opportunity_id_key
  on public.opportunities (opportunity_id);

create unique index if not exists opportunities_base_code_version_key
  on public.opportunities (base_code, version);

-- Keep updated_at current for edits.
create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_opportunities_updated_at on public.opportunities;

create trigger trg_opportunities_updated_at
before update on public.opportunities
for each row
execute function public.set_timestamp_updated_at();
