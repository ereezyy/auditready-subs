-- AuditReady Subs schema. Apply in the Supabase SQL editor or via the Supabase CLI.
-- The Next.js server uses the service role after it has checked the session.
-- Row level security still locks the tables down if the anon key is used directly.

create extension if not exists pgcrypto;

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  contact_name text not null default '',
  company_name text not null,
  address1 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'plus')),
  subscription_status text not null default 'trialing' check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  audit_rescue_purchased_at timestamptz,
  requirements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  trade text not null default '',
  agent_name text not null default '',
  agent_email text not null default '',
  upload_token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists subcontractors_contractor_idx on public.subcontractors (contractor_id);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  subcontractor_id uuid not null references public.subcontractors(id) on delete cascade,
  blob_id text not null,
  filename text not null,
  mime_type text not null,
  byte_size integer not null default 0,
  status text not null default 'pending_review' check (status in ('pending_review', 'confirmed', 'rejected')),
  extraction jsonb,
  confirmed jsonb,
  uploaded_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists certificates_contractor_idx on public.certificates (contractor_id, uploaded_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  payee_name text not null,
  amount_cents integer not null,
  paid_on date not null,
  memo text not null default '',
  imported_at timestamptz not null default now()
);

create index if not exists payments_contractor_idx on public.payments (contractor_id, paid_on);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  subcontractor_id uuid not null references public.subcontractors(id) on delete cascade,
  certificate_id uuid references public.certificates(id) on delete set null,
  milestone integer not null check (milestone in (30, 14, 7, 0)),
  expiry_date date not null,
  sent_at timestamptz not null default now(),
  unique (certificate_id, milestone, expiry_date)
);

create table if not exists public.outbox (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id) on delete cascade,
  to_email text not null,
  cc_email text,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'certificate_checker',
  summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.contractors enable row level security;
alter table public.subcontractors enable row level security;
alter table public.certificates enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;
alter table public.outbox enable row level security;
alter table public.leads enable row level security;

create or replace function public.current_contractor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.contractors where auth_user_id = auth.uid()
$$;

revoke all on function public.current_contractor_id() from public, anon;
grant execute on function public.current_contractor_id() to authenticated;

drop policy if exists contractors_select_own on public.contractors;
create policy contractors_select_own on public.contractors
  for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists contractors_insert_own on public.contractors;
create policy contractors_insert_own on public.contractors
  for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists contractors_update_own on public.contractors;
create policy contractors_update_own on public.contractors
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists subs_own on public.subcontractors;
create policy subs_own on public.subcontractors
  for all to authenticated
  using (contractor_id = public.current_contractor_id())
  with check (contractor_id = public.current_contractor_id());

drop policy if exists certificates_own on public.certificates;
create policy certificates_own on public.certificates
  for all to authenticated
  using (contractor_id = public.current_contractor_id())
  with check (contractor_id = public.current_contractor_id());

drop policy if exists payments_own on public.payments;
create policy payments_own on public.payments
  for all to authenticated
  using (contractor_id = public.current_contractor_id())
  with check (contractor_id = public.current_contractor_id());

drop policy if exists reminders_own on public.reminders;
create policy reminders_own on public.reminders
  for all to authenticated
  using (contractor_id = public.current_contractor_id())
  with check (contractor_id = public.current_contractor_id());

drop policy if exists outbox_own on public.outbox;
create policy outbox_own on public.outbox
  for select to authenticated
  using (contractor_id = public.current_contractor_id());

-- Leads are written by the service role only. No authenticated or anon policy.

revoke all on table public.leads from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

drop policy if exists certificates_storage_read on storage.objects;
create policy certificates_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certificates'
    and exists (
      select 1 from public.contractors c
      where c.auth_user_id = auth.uid()
        and (storage.foldername(name))[1] = c.id::text
    )
  );

drop policy if exists certificates_storage_write on storage.objects;
create policy certificates_storage_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certificates'
    and exists (
      select 1 from public.contractors c
      where c.auth_user_id = auth.uid()
        and (storage.foldername(name))[1] = c.id::text
    )
  );
