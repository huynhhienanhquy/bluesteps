create table app_private.event_reminder_preferences (
  user_id uuid primary key references app_private.users,
  enabled boolean not null default false,
  offsets jsonb not null default '[60,1440]',
  in_app boolean not null default true,
  email boolean not null default false,
  sound boolean not null default true,
  quiet_start text not null default '22:00' check (quiet_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_end text not null default '07:00' check (quiet_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  version integer not null default 1 check (version>0),
  updated_at timestamptz not null default now()
);
create table app_private.event_reminder_targets (
  user_id uuid not null references app_private.event_reminder_preferences on delete cascade,
  event_id uuid not null references app_private.events,
  primary key(user_id,event_id)
);
create table app_private.event_reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.event_reminder_preferences,
  event_id uuid not null references app_private.events,
  offset_minutes integer not null check (offset_minutes between 1 and 43200),
  preferences_version integer not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','dispatched','cancelled')),
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,event_id,offset_minutes,preferences_version)
);
create index reminder_jobs_due on app_private.event_reminder_jobs(scheduled_for,id) where status='pending';
do $$ declare name text; begin
  foreach name in array array['event_reminder_preferences','event_reminder_targets','event_reminder_jobs'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
