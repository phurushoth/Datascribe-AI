create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique not null,
  email text unique not null,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  document_type text not null default 'Document',
  workflow text not null check (workflow in ('extraction','form-fill')),
  status text not null default 'completed' check (status in ('completed','attention','processing','failed')),
  drive_file_id text,
  result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  format text not null,
  drive_file_id text,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_created_idx on documents(user_id, created_at desc);
create index if not exists exports_user_created_idx on exports(user_id, created_at desc);

-- v0.2 real-data extensions
alter table users add column if not exists google_refresh_token_enc text;
alter table documents add column if not exists form_schema_json jsonb;
alter table exports add column if not exists file_name text;
