create table app_private.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  host_id uuid not null references app_private.users,
  scheduled_at timestamptz,
  started_at timestamptz,
  created_at timestamptz not null default now()
);
create table app_private.game_room_players (
  room_id uuid not null references app_private.game_rooms on delete cascade,
  user_id uuid not null references app_private.users,
  joined_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers smallint[],
  score smallint check(score between 0 and 6),
  primary key(room_id,user_id),
  check((answers is null and score is null and submitted_at is null) or
    (answers is not null and cardinality(answers)=6 and score is not null and submitted_at is not null))
);
create index game_room_players_user on app_private.game_room_players(user_id,joined_at desc);
do $$ declare name text; begin
  foreach name in array array['game_rooms','game_room_players'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
