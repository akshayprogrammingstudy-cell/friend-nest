-- FriendNest full Supabase fix query
-- Fixes: Aishwarya chat send/receive, memory photo/text uploads, task completion visibility.
-- Run this full file in Supabase SQL Editor.
-- No email replacement is required in this SQL. Keep Supabase Auth signup disabled and manually create only the two users.

create extension if not exists pgcrypto;

-- Core tables
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_name text not null,
  content text not null,
  type text not null default 'text',
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_status (
  email text primary key,
  user_id uuid,
  name text,
  is_online boolean not null default false,
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  assigned_to text not null default 'both',
  created_by text not null,
  created_by_email text,
  due_date date,
  priority text not null default 'medium',
  status text not null default 'pending',
  completed_by text,
  completed_by_email text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Make older task tables compatible
alter table public.tasks add column if not exists created_by_email text;
alter table public.tasks add column if not exists completed_by text;
alter table public.tasks add column if not exists completed_by_email text;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();

-- Relax old constraints safely and create updated constraints
alter table public.tasks drop constraint if exists tasks_assigned_to_check;
alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks drop constraint if exists tasks_status_check;

alter table public.tasks add constraint tasks_assigned_to_check check (assigned_to in ('akshay','aishwarya','both','me'));
alter table public.tasks add constraint tasks_priority_check check (priority in ('low','medium','high'));
alter table public.tasks add constraint tasks_status_check check (status in ('pending','in_progress','completed'));

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_name text default '',
  issuing_org text default '',
  completion_date date,
  tags text[] not null default '{}',
  user_name text not null,
  user_email text,
  file_url text,
  file_path text,
  file_name text,
  file_mime text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.certificates add column if not exists user_email text;
alter table public.certificates add column if not exists file_url text;
alter table public.certificates add column if not exists file_path text;
alter table public.certificates add column if not exists file_name text;
alter table public.certificates add column if not exists file_mime text;
alter table public.certificates add column if not exists file_size bigint;

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'document',
  user_name text not null,
  user_email text,
  file_url text,
  file_path text,
  file_mime text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.media_files drop constraint if exists media_files_type_check;
alter table public.media_files add constraint media_files_type_check check (type in ('photo','video','document'));
alter table public.media_files add column if not exists user_email text;
alter table public.media_files add column if not exists file_url text;
alter table public.media_files add column if not exists file_path text;
alter table public.media_files add column if not exists file_mime text;
alter table public.media_files add column if not exists file_size bigint;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text default '',
  date date not null default current_date,
  is_favorite boolean not null default false,
  created_by text not null,
  user_email text,
  image_url text,
  file_url text,
  file_path text,
  file_name text,
  file_mime text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.memories add column if not exists user_email text;
alter table public.memories add column if not exists image_url text;
alter table public.memories add column if not exists file_url text;
alter table public.memories add column if not exists file_path text;
alter table public.memories add column if not exists file_name text;
alter table public.memories add column if not exists file_mime text;
alter table public.memories add column if not exists file_size bigint;

create table if not exists public.pinned_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  item_id uuid not null,
  pinned_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.birthday_memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  birthday_date date not null,
  created_for text not null default 'Aishwarya',
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.messages enable row level security;
alter table public.user_status enable row level security;
alter table public.tasks enable row level security;
alter table public.certificates enable row level security;
alter table public.media_files enable row level security;
alter table public.memories enable row level security;
alter table public.pinned_items enable row level security;
alter table public.birthday_memories enable row level security;

-- Drop old restrictive policies. This fixes the issue where Aishwarya could login but could not send/save.
do $$
declare
  t text;
  p text;
begin
  foreach t in array array['messages','user_status','tasks','certificates','media_files','memories','pinned_items','birthday_memories'] loop
    foreach p in array array[
      'friendnest_select','friendnest_insert','friendnest_update','friendnest_delete',
      'friendnest_authenticated_select','friendnest_authenticated_insert','friendnest_authenticated_update','friendnest_authenticated_delete'
    ] loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
  end loop;
end $$;

-- Policies: authenticated users can read/write the private app data.
-- Security is controlled by Supabase Auth users + FriendNest frontend allowed-email check.
create policy friendnest_authenticated_select on public.messages for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.messages for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.messages for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.messages for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.user_status for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.user_status for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.user_status for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.user_status for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.tasks for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.tasks for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.tasks for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.tasks for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.certificates for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.certificates for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.certificates for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.certificates for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.media_files for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.media_files for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.media_files for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.media_files for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.memories for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.memories for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.memories for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.memories for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.pinned_items for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.pinned_items for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.pinned_items for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.pinned_items for delete to authenticated using (true);

create policy friendnest_authenticated_select on public.birthday_memories for select to authenticated using (true);
create policy friendnest_authenticated_insert on public.birthday_memories for insert to authenticated with check (true);
create policy friendnest_authenticated_update on public.birthday_memories for update to authenticated using (true) with check (true);
create policy friendnest_authenticated_delete on public.birthday_memories for delete to authenticated using (true);

-- Storage bucket for certificates, media, and memory photos
insert into storage.buckets (id, name, public)
values ('friendnest-files', 'friendnest-files', false)
on conflict (id) do nothing;

drop policy if exists friendnest_storage_select on storage.objects;
drop policy if exists friendnest_storage_insert on storage.objects;
drop policy if exists friendnest_storage_update on storage.objects;
drop policy if exists friendnest_storage_delete on storage.objects;
drop policy if exists friendnest_storage_authenticated_select on storage.objects;
drop policy if exists friendnest_storage_authenticated_insert on storage.objects;
drop policy if exists friendnest_storage_authenticated_update on storage.objects;
drop policy if exists friendnest_storage_authenticated_delete on storage.objects;

create policy friendnest_storage_authenticated_select on storage.objects
for select to authenticated using (bucket_id = 'friendnest-files');

create policy friendnest_storage_authenticated_insert on storage.objects
for insert to authenticated with check (bucket_id = 'friendnest-files');

create policy friendnest_storage_authenticated_update on storage.objects
for update to authenticated using (bucket_id = 'friendnest-files') with check (bucket_id = 'friendnest-files');

create policy friendnest_storage_authenticated_delete on storage.objects
for delete to authenticated using (bucket_id = 'friendnest-files');

-- Realtime: needed so messages, task completion, memories, certificates, and media appear on the other login.
alter table public.messages replica identity full;
alter table public.user_status replica identity full;
alter table public.tasks replica identity full;
alter table public.certificates replica identity full;
alter table public.media_files replica identity full;
alter table public.memories replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.user_status;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.certificates;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.media_files;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.memories;
  exception when duplicate_object or undefined_object then null;
  end;
end $$;

-- Helpful indexes
create index if not exists messages_created_at_idx on public.messages (created_at);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists memories_date_idx on public.memories (date desc);
create index if not exists certificates_created_at_idx on public.certificates (created_at desc);
create index if not exists media_files_created_at_idx on public.media_files (created_at desc);

-- Done.
