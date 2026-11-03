-- Persistent participation, tickets and reviews. Catalog mutations remain restricted.
create table app_private.event_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  event_id uuid not null references app_private.events,
  full_name text not null check (length(full_name) between 2 and 100),
  attendee_count integer not null check (attendee_count between 1 and 20),
  volunteer_role text not null check (length(volunteer_role) between 1 and 200),
  phone text not null check (length(phone) between 6 and 24),
  email text not null check (length(email) <= 254),
  safety_consent boolean not null check (safety_consent),
  contact_consent boolean not null check (contact_consent),
  status text not null default 'registered' check (status in ('registered','cancelled')),
  ticket_revision integer not null default 1,
  checked_in_at timestamptz,
  checked_in_by uuid references app_private.users,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,user_id)
);
create index event_registration_owner on app_private.event_registrations(user_id,created_at desc,id desc);

create table app_private.event_organizers (
  event_id uuid not null references app_private.events,
  user_id uuid not null references app_private.users,
  primary key(event_id,user_id)
);
create table app_private.event_feedback (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references app_private.event_registrations,
  user_id uuid not null references app_private.users,
  event_id uuid not null references app_private.events,
  rating integer not null check (rating between 1 and 5),
  tags jsonb not null default '[]',
  body text not null default '' check (length(body)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare name text; begin
  foreach name in array array['event_registrations','event_organizers','event_feedback'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
revoke insert,update,delete on app_private.event_organizers from bluesteps_runtime;

-- The runtime cannot update event catalog columns. This narrowly scoped function only
-- reserves/releases seats and enforces capacity under the event row's database lock.
create function app_private.adjust_event_seats(p_event uuid,p_delta integer) returns boolean
language plpgsql security definer set search_path=pg_catalog,app_private as $$
begin
  if p_delta=0 or p_delta not between -20 and 20 then return false; end if;
  update app_private.events set reserved_count=reserved_count+p_delta,version=version+1
    where id=p_event and (p_delta<0 or (published and not synthetic and starts_at>now()))
    and reserved_count+p_delta between 0 and capacity;
  return found;
end $$;
revoke all on function app_private.adjust_event_seats(uuid,integer) from public;
grant execute on function app_private.adjust_event_seats(uuid,integer) to bluesteps_runtime;
