alter table app_private.user_preferences
  add column interests jsonb not null default '[]',
  add column goal text check (goal in ('sorting','reduce','community'));

create table app_private.article_reactions (
  user_id uuid not null references app_private.users,
  article_id uuid not null references app_private.articles,
  primary key(user_id,article_id)
);
create table app_private.followed_topics (
  user_id uuid not null references app_private.users,
  topic text not null check (length(topic) between 1 and 100),
  primary key(user_id,topic)
);
create table app_private.saved_posts (
  user_id uuid not null references app_private.users,
  post_id uuid not null references app_private.posts,
  primary key(user_id,post_id)
);
create table app_private.handovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  stop_id uuid not null unique references app_private.route_stops,
  evidence_status text not null default 'self_reported' check (evidence_status='self_reported'),
  created_at timestamptz not null default now()
);
do $$ declare name text; begin
  foreach name in array array['article_reactions','followed_topics','saved_posts','handovers'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
revoke update,delete on app_private.handovers from bluesteps_runtime;
