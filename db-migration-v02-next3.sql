-- Run this if db-schema.sql from the previous module is already installed.
alter table users add column if not exists google_refresh_token_enc text;
alter table documents add column if not exists form_schema_json jsonb;
alter table exports add column if not exists file_name text;
