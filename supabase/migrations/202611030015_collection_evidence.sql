alter table app_private.point_proposals
  add column hours text not null default '' check(length(hours)<=500),
  add column submitted_at timestamptz,
  add column acknowledged_at timestamptz;
create table app_private.point_proposal_media (
  proposal_id uuid not null references app_private.point_proposals,
  asset_id uuid not null references app_private.media_assets,
  position integer not null check(position between 0 and 4),
  primary key(proposal_id,asset_id), unique(proposal_id,position)
);
create table app_private.point_report_media (
  report_id uuid not null references app_private.point_reports,
  asset_id uuid not null references app_private.media_assets,
  position integer not null check(position between 0 and 4),
  primary key(report_id,asset_id), unique(report_id,position)
);
create index point_proposal_media_asset on app_private.point_proposal_media(asset_id);
create index point_report_media_asset on app_private.point_report_media(asset_id);
alter table app_private.point_proposal_media enable row level security;
alter table app_private.point_report_media enable row level security;
create policy runtime_only on app_private.point_proposal_media to bluesteps_runtime using(true) with check(true);
create policy runtime_only on app_private.point_report_media to bluesteps_runtime using(true) with check(true);
revoke all on app_private.point_proposal_media,app_private.point_report_media from public;
grant select,insert,update,delete on app_private.point_proposal_media,app_private.point_report_media to bluesteps_runtime;
