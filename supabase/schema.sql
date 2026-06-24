-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It creates the two tables the portal needs. The app seeds content on first load.

create table if not exists app_state (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  role text not null,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx on messages (created_at);

-- Lock the tables down. The app talks to the database only through the
-- server-side service-role key, which bypasses RLS. With RLS enabled and no
-- policies, nothing is reachable with the public anon key.
alter table app_state enable row level security;
alter table messages enable row level security;
