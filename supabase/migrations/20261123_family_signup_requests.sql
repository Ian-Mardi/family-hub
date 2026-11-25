-- Family Hub early-access approval requests. Run in Supabase SQL Editor.
create table if not exists public.family_signup_requests (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  contact_name text not null,
  email text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists family_signup_requests_email_idx on public.family_signup_requests(lower(email));
create index if not exists family_signup_requests_status_idx on public.family_signup_requests(status);
alter table public.family_signup_requests enable row level security;
-- Anonymous visitors can submit a request, but cannot read or alter the queue.
drop policy if exists "Public may submit access requests" on public.family_signup_requests;
create policy "Public may submit access requests" on public.family_signup_requests for insert to anon, authenticated with check (status='pending' and reviewed_at is null);
-- Authenticated applicants may see only the requests associated with their sign-in email.
drop policy if exists "Applicants read own requests" on public.family_signup_requests;
create policy "Applicants read own requests" on public.family_signup_requests for select to authenticated using (lower(email)=lower((select auth.jwt()->>'email')));
-- Administrative actions are performed only by the local developer server using the service-role key.
