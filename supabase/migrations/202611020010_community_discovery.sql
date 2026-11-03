alter table app_private.posts add column topic text check (length(topic) between 1 and 80);
create index posts_topic on app_private.posts(topic,created_at desc,id desc) where deleted_at is null;

create table app_private.member_follows (
  user_id uuid not null references app_private.users,
  followed_user_id uuid not null references app_private.users,
  created_at timestamptz not null default now(),
  primary key(user_id,followed_user_id), check (user_id<>followed_user_id)
);
create index member_followers on app_private.member_follows(followed_user_id,user_id);
create table app_private.hidden_posts (
  user_id uuid not null references app_private.users,
  post_id uuid not null references app_private.posts,
  created_at timestamptz not null default now(), primary key(user_id,post_id)
);
do $$ declare name text; begin
  foreach name in array array['member_follows','hidden_posts'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
