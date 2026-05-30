-- ResearchOS Database Schema
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

create type session_stage as enum ('ideation', 'prototyping', 'writing', 'published');
create type folder_type   as enum ('ideas', 'code', 'paper');
create type message_role  as enum ('user', 'assistant');

drop table if exists sessions cascade;
drop table if exists folders cascade;
drop table if exists messages cascade;
drop table if exists shared_contexts cascade;

create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text,
  title      text not null,
  stage      session_stage default 'ideation',
  created_at timestamptz default now()
);

create table if not exists folders (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions on delete cascade not null,
  type       folder_type not null,
  created_at timestamptz default now(),
  unique(session_id, type)
);

create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid references folders on delete cascade not null,
  role          message_role not null,
  content       text not null,
  is_shareable  boolean default false,
  created_at    timestamptz default now()
);

create table if not exists shared_contexts (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references messages on delete cascade not null,
  session_id    uuid references sessions on delete cascade not null,
  target_folder folder_type not null check (target_folder != 'ideas'),
  summary       text not null,
  pinned_order  int default 0,
  accepted_at   timestamptz default now()
);

-- Disable RLS for development
alter table sessions disable row level security;
alter table folders disable row level security;
alter table messages disable row level security;
alter table shared_contexts disable row level security;

-- Indexes
create index if not exists idx_messages_folder_created on messages (folder_id, created_at);
create index if not exists idx_shared_contexts_session_folder on shared_contexts (session_id, target_folder);
