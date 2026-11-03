alter table app_private.routes drop constraint routes_mode_check;
alter table app_private.routes add constraint routes_mode_check check(mode in ('walking','cycling','motorcycling','driving'));
alter table app_private.routes add column plan jsonb;
