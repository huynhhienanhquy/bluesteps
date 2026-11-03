alter table app_private.outbox_events add column lease_token uuid,
  add column locked_until timestamptz, add column last_error_code text;
