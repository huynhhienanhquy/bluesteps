alter table app_private.notifications add column category text not null default 'activity'
  check(category in ('activity','offers','community','news'));
alter table app_private.notifications add column target_path text;
alter table app_private.notifications add column details jsonb not null default '{}';
create index notifications_unread on app_private.notifications(user_id,created_at desc,id desc) where read_at is null;
create table app_private.notification_preferences (
  user_id uuid primary key references app_private.users,
  activity boolean not null default true,
  offers boolean not null default true,
  community boolean not null default true,
  news boolean not null default true,
  daily_reminder boolean not null default false,
  daily_time text not null default '20:00' check(daily_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  version integer not null default 1 check(version>0)
);
create table app_private.daily_reminder_deliveries (
  user_id uuid not null references app_private.users,
  reminder_date date not null,
  notification_id uuid not null references app_private.notifications,
  primary key(user_id,reminder_date)
);
do $$ declare name text; begin
  foreach name in array array['notification_preferences','daily_reminder_deliveries'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
