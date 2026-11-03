alter table app_private.media_assets drop constraint media_assets_kind_check;
alter table app_private.media_assets add constraint media_assets_kind_check check(kind in ('image','video','audio','file'));
alter table app_private.media_assets add column duration_ms integer check(duration_ms between 1 and 120000);
alter table app_private.messages drop constraint messages_body_check;
alter table app_private.messages add constraint messages_body_check check(length(body)<=4000);
create table app_private.message_media (
  message_id uuid not null references app_private.messages,
  asset_id uuid not null references app_private.media_assets,
  position integer not null check(position between 0 and 9),
  primary key(message_id,asset_id), unique(message_id,position)
);
create index message_media_asset on app_private.message_media(asset_id);
alter table app_private.message_media enable row level security;
create policy runtime_only on app_private.message_media to bluesteps_runtime using(true) with check(true);
revoke all on app_private.message_media from public;
grant select,insert,update,delete on app_private.message_media to bluesteps_runtime;
