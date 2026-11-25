-- Family Hub shared gallery and memory support. Apply in Supabase SQL editor.
alter table public.tasks add column if not exists recurrence text;
create table if not exists public.family_gallery_media (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 conversation_id uuid references public.conversations(id) on delete set null, message_id uuid references public.messages(id) on delete set null,
 uploader_id uuid not null references auth.users(id), storage_path text not null, caption text, is_favorite boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.family_gallery_albums (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 title text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.family_gallery_album_items (
 album_id uuid not null references public.family_gallery_albums(id) on delete cascade, media_id uuid not null references public.family_gallery_media(id) on delete cascade,
 family_id uuid not null references public.families(id) on delete cascade, primary key(album_id,media_id)
);
create table if not exists public.family_gallery_removal_requests (
 id uuid primary key default gen_random_uuid(), media_id uuid not null references public.family_gallery_media(id) on delete cascade,
 family_id uuid not null references public.families(id) on delete cascade, requester_id uuid not null references auth.users(id), uploader_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','approved','declined')), created_at timestamptz not null default now(), decided_at timestamptz
);
create table if not exists public.family_gallery_memories (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 title text not null, created_by uuid not null references auth.users(id), status text not null default 'pending' check(status in ('pending','accepted','declined')), created_at timestamptz not null default now()
);
create table if not exists public.family_gallery_memory_items (
 memory_id uuid not null references public.family_gallery_memories(id) on delete cascade, media_id uuid not null references public.family_gallery_media(id) on delete cascade,
 family_id uuid not null references public.families(id) on delete cascade, primary key(memory_id,media_id)
);
create or replace function public.gallery_family_member(p_family_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.family_members fm where fm.family_id=p_family_id and fm.user_id=auth.uid()) $$;

alter table public.family_gallery_media enable row level security;
alter table public.family_gallery_albums enable row level security;
alter table public.family_gallery_album_items enable row level security;
alter table public.family_gallery_removal_requests enable row level security;
alter table public.family_gallery_memories enable row level security;
alter table public.family_gallery_memory_items enable row level security;
create policy "family gallery member select" on public.family_gallery_media for select using(public.gallery_family_member(family_id));
create policy "family gallery member insert" on public.family_gallery_media for insert with check(public.gallery_family_member(family_id) and uploader_id=auth.uid());
create policy "family gallery member favorite update" on public.family_gallery_media for update using(public.gallery_family_member(family_id)) with check(public.gallery_family_member(family_id));
create policy "family gallery member delete" on public.family_gallery_media for delete using(public.gallery_family_member(family_id));
create policy "family albums read" on public.family_gallery_albums for select using(public.gallery_family_member(family_id));
create policy "family albums create" on public.family_gallery_albums for insert with check(public.gallery_family_member(family_id) and created_by=auth.uid());
create policy "family album items read" on public.family_gallery_album_items for select using(public.gallery_family_member(family_id));
create policy "family album items create" on public.family_gallery_album_items for insert with check(public.gallery_family_member(family_id));
create policy "family album items update" on public.family_gallery_album_items for update using(public.gallery_family_member(family_id)) with check(public.gallery_family_member(family_id));
create policy "removal request read" on public.family_gallery_removal_requests for select using(public.gallery_family_member(family_id));
create policy "removal request create" on public.family_gallery_removal_requests for insert with check(public.gallery_family_member(family_id) and requester_id=auth.uid());
create policy "removal request decision" on public.family_gallery_removal_requests for update using(public.gallery_family_member(family_id) and uploader_id=auth.uid()) with check(public.gallery_family_member(family_id) and uploader_id=auth.uid());
create policy "memories read" on public.family_gallery_memories for select using(public.gallery_family_member(family_id));
create policy "memories create" on public.family_gallery_memories for insert with check(public.gallery_family_member(family_id) and created_by=auth.uid());
create policy "memories accept" on public.family_gallery_memories for update using(public.gallery_family_member(family_id)) with check(public.gallery_family_member(family_id));
create policy "memory items read" on public.family_gallery_memory_items for select using(public.gallery_family_member(family_id));
create policy "memory items create" on public.family_gallery_memory_items for insert with check(public.gallery_family_member(family_id));

insert into storage.buckets(id,name,public) values('family-gallery','family-gallery',false) on conflict(id) do nothing;
create policy "family gallery storage read" on storage.objects for select using(bucket_id='family-gallery' and public.gallery_family_member((storage.foldername(name))[1]::uuid));
create policy "family gallery storage upload" on storage.objects for insert with check(bucket_id='family-gallery' and public.gallery_family_member((storage.foldername(name))[1]::uuid));
create policy "family gallery storage delete" on storage.objects for delete using(bucket_id='family-gallery' and public.gallery_family_member((storage.foldername(name))[1]::uuid));
