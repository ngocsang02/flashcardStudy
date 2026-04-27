create extension if not exists "pgcrypto";

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  image text not null,
  phonetic text,
  vietnamese_meaning text,
  part_of_speech text,
  definition text,
  example text,
  example_vietnamese text,
  is_favorite boolean not null default false,
  folder_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.flashcards
add column if not exists folder_id uuid references public.folders(id) on delete set null;

alter table public.flashcards
add column if not exists example_vietnamese text;

create index if not exists flashcards_folder_id_idx on public.flashcards(folder_id);

alter table public.folders enable row level security;
alter table public.flashcards enable row level security;

drop policy if exists "Allow anon full access for demo folders" on public.folders;
create policy "Allow anon full access for demo folders"
on public.folders
for all
using (true)
with check (true);

drop policy if exists "Allow anon full access for demo" on public.flashcards;
create policy "Allow anon full access for demo"
on public.flashcards
for all
using (true)
with check (true);
