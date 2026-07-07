-- Create push_tokens table for Expo push notification tokens

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

-- Unique index on token so re-registration upserts rather than duplicates
create unique index if not exists push_tokens_token_key on push_tokens (token);

-- Allow users to manage their own tokens
alter table push_tokens enable row level security;

create policy "Users can insert their own push tokens"
  on push_tokens for insert
  with check (
    profile_id = (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can update their own push tokens"
  on push_tokens for update
  using (
    profile_id = (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can delete their own push tokens"
  on push_tokens for delete
  using (
    profile_id = (select id from profiles where auth_user_id = auth.uid())
  );

create policy "Users can view their own push tokens"
  on push_tokens for select
  using (
    profile_id = (select id from profiles where auth_user_id = auth.uid())
  );
