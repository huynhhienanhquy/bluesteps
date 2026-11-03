alter table app_private.sorting_actions add column reported_weight_kg numeric(10,3)
  check(reported_weight_kg>0 and reported_weight_kg<=10000);
create table app_private.personal_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  title text not null check(length(title) between 1 and 80),
  metric text not null check(metric in ('sorting_actions','reported_weight_kg','event_checkins')),
  target numeric(12,3) not null check(target>0 and target<=1000000),
  starts_on date not null,
  ends_on date not null,
  timezone text not null,
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check(ends_on>=starts_on and ends_on-starts_on<=365)
);
create index personal_targets_owner on app_private.personal_targets(user_id,created_at desc) where archived_at is null;
create table app_private.leaderboard_preferences (
  user_id uuid primary key references app_private.users,
  opted_in boolean not null default false,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
do $$ declare name text; begin
  foreach name in array array['personal_targets','leaderboard_preferences'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check(true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
