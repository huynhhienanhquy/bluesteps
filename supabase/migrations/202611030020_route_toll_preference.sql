alter table app_private.routes
  add column prefer_no_tolls boolean not null default false;

update app_private.routes
set prefer_no_tolls = true
where plan->'preferNoTolls' = 'true'::jsonb;
