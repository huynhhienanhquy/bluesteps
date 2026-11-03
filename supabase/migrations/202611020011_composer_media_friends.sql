alter table app_private.posts drop constraint posts_visibility_check;
alter table app_private.posts add constraint posts_visibility_check check (visibility in ('public','friends','private'));
alter table app_private.posts drop constraint posts_body_check;
alter table app_private.posts add constraint posts_body_check check (length(body)<=5000);
alter table app_private.posts add column emotion text;
alter table app_private.posts add column place jsonb check (place is null or jsonb_typeof(place)='object');

create table app_private.friendships (
  requester_id uuid not null references app_private.users,
  recipient_id uuid not null references app_private.users,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(requester_id,recipient_id), check(requester_id<>recipient_id)
);
create unique index friendship_pair on app_private.friendships
  (least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index friendship_recipient on app_private.friendships(recipient_id,created_at desc);

-- Private durable binary storage. Content is never exposed through a public table/bucket.
-- Chunked transfer bounds each request; finalization validates and normalizes images.
create table app_private.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  client_upload_id uuid not null,
  kind text not null check(kind in ('image','video','file')),
  file_name text not null check(length(file_name) between 1 and 180),
  mime_type text not null check(length(mime_type)<=120),
  expected_size integer not null check(expected_size between 1 and 20971520),
  size integer check(size between 1 and 20971520),
  sha256 text, width integer, height integer, content bytea,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,client_upload_id),
  check ((completed_at is null and content is null) or
    (completed_at is not null and content is not null and octet_length(content)=size and sha256 is not null))
);
create index media_owner on app_private.media_assets(user_id,created_at desc);
create table app_private.media_chunks (
  asset_id uuid not null references app_private.media_assets on delete cascade,
  part integer not null check(part between 0 and 79),
  content bytea not null check(octet_length(content) between 1 and 262144),
  primary key(asset_id,part)
);
create table app_private.post_media (
  post_id uuid not null references app_private.posts,
  asset_id uuid not null references app_private.media_assets,
  position integer not null check(position between 0 and 9),
  primary key(post_id,asset_id), unique(post_id,position)
);
create table app_private.post_drafts (
  user_id uuid primary key references app_private.users,
  content jsonb not null check(jsonb_typeof(content)='object'),
  version integer not null default 1 check(version>0),
  updated_at timestamptz not null default now()
);
do $$ declare name text; begin
  foreach name in array array['friendships','media_assets','media_chunks','post_media','post_drafts'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
