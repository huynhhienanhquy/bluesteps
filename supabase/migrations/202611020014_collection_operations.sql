alter table app_private.collection_points
  add column staffed boolean,
  add column always_open boolean,
  add column schedule_known boolean not null default false,
  add column capacity_state text not null default 'unknown' check(capacity_state in ('unknown','available','limited','full','closed')),
  add column status_observed_at timestamptz,
  add column status_expires_at timestamptz,
  add check(capacity_state='unknown' or (status_observed_at is not null and status_expires_at is not null and status_expires_at>status_observed_at));
create table app_private.point_opening_hours (
  point_id uuid not null references app_private.collection_points,
  weekday smallint not null check(weekday between 0 and 6),
  start_min integer not null check(start_min between 0 and 1439),
  end_min integer not null check(end_min>start_min and end_min<=start_min+1440),
  primary key(point_id,weekday,start_min)
);
alter table app_private.point_opening_hours enable row level security;
create policy runtime_only on app_private.point_opening_hours to bluesteps_runtime using(true) with check(true);
revoke all on app_private.point_opening_hours from public;
grant select,insert,update,delete on app_private.point_opening_hours to bluesteps_runtime;
create function app_private.point_open_at(point uuid, at_time timestamptz) returns boolean
  language sql stable security invoker set search_path=pg_catalog,app_private as $$
  select case when p.always_open then true when not p.schedule_known then null else exists(
    select 1 from app_private.point_opening_hours h
    where h.point_id=p.id and (
      (h.weekday=extract(isodow from (at_time at time zone p.timezone))::int-1
       and extract(hour from (at_time at time zone p.timezone))*60+extract(minute from (at_time at time zone p.timezone))>=h.start_min
       and extract(hour from (at_time at time zone p.timezone))*60+extract(minute from (at_time at time zone p.timezone))<h.end_min)
      or (h.weekday=(extract(isodow from (at_time at time zone p.timezone))::int+5)%7 and h.end_min>1440
       and extract(hour from (at_time at time zone p.timezone))*60+extract(minute from (at_time at time zone p.timezone))<h.end_min-1440)
    )) end from app_private.collection_points p where p.id=point
$$;
revoke all on function app_private.point_open_at(uuid,timestamptz) from public;
grant execute on function app_private.point_open_at(uuid,timestamptz) to bluesteps_runtime;
create table app_private.route_stop_replacements (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references app_private.routes,
  actor_id uuid not null references app_private.users,
  old_stop_id uuid not null,
  new_stop_id uuid not null,
  old_point_id uuid not null references app_private.collection_points,
  new_point_id uuid not null references app_private.collection_points,
  created_at timestamptz not null default now()
);
alter table app_private.route_stop_replacements enable row level security;
create policy runtime_only on app_private.route_stop_replacements to bluesteps_runtime using(true) with check(true);
revoke all on app_private.route_stop_replacements from public;
grant select,insert on app_private.route_stop_replacements to bluesteps_runtime;
