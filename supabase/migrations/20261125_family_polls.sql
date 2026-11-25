create table if not exists public.family_polls (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  options jsonb not null default '[]'::jsonb,
  votes jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  popup_enabled boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.family_polls enable row level security;
create policy "family members can read polls" on public.family_polls for select using (exists(select 1 from public.family_members fm where fm.family_id=family_polls.family_id and fm.user_id=auth.uid()));
create policy "family members can create polls" on public.family_polls for insert with check (exists(select 1 from public.family_members fm where fm.family_id=family_polls.family_id and fm.user_id=auth.uid()));
create policy "family members can update polls" on public.family_polls for update using (exists(select 1 from public.family_members fm where fm.family_id=family_polls.family_id and fm.user_id=auth.uid())) with check (exists(select 1 from public.family_members fm where fm.family_id=family_polls.family_id and fm.user_id=auth.uid()));
create policy "family members can delete polls" on public.family_polls for delete using (exists(select 1 from public.family_members fm where fm.family_id=family_polls.family_id and fm.user_id=auth.uid()));
