create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_picture text not null,
  event_day date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id)
);
