create table app_private.auth_recipient_cooldowns (
  recipient_hash text primary key, next_allowed_at timestamptz not null
);
alter table app_private.auth_recipient_cooldowns enable row level security;
create policy runtime_only on app_private.auth_recipient_cooldowns to bluesteps_runtime
  using (true) with check (true);
revoke all on app_private.auth_recipient_cooldowns from public;
grant select,insert,update,delete on app_private.auth_recipient_cooldowns to bluesteps_runtime;
