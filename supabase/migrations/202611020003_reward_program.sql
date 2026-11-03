create table app_private.reward_program (
  id boolean primary key default true check(id),
  enabled boolean not null default true,
  version text not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  daily_points jsonb not null,
  sorting_points jsonb not null,
  sorting_daily_limit integer not null default 30 check(sorting_daily_limit between 1 and 100),
  level_thresholds jsonb not null
);
-- Defaults reproduce the visible 5/2/3 sorting rules and the 2/2/3/box/3/5/box
-- attendance strip. The two boxes are fixed 5 and 10 point milestones, not a draw.
insert into app_private.reward_program(id,version,daily_points,sorting_points,level_thresholds)
values (true,'2026-11-v1','[2,2,3,5,3,5,10]','{"recycle":5,"inorganic":2,"organic":3}',
  '[100,200,350,500,700]');
create table app_private.daily_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  claimed_on date not null,
  streak integer not null check(streak>0),
  points integer not null check(points>0),
  rule_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id,claimed_on)
);
do $$ declare name text; begin
  foreach name in array array['reward_program','daily_claims'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
grant insert on app_private.daily_claims to bluesteps_runtime;

-- Preserve the catalog privilege boundary while allowing atomic reservations.
create function app_private.reserve_reward_stock(p_reward uuid,p_quantity integer)
returns table(unit_cost bigint,reward_version integer)
language plpgsql security definer set search_path=pg_catalog,app_private as $$
declare item record;
begin
  if p_quantity not between 1 and 20 or not exists(select 1 from app_private.reward_program where id and enabled)
    then return; end if;
  select r.cost_points,r.version,i.on_hand,i.reserved into item
    from app_private.rewards r join app_private.reward_inventory i on i.reward_id=r.id
    where r.id=p_reward and r.state='published' and not r.synthetic
    for update of i for share of r;
  if not found or item.on_hand-item.reserved<p_quantity then return; end if;
  update app_private.reward_inventory set reserved=reserved+p_quantity where reward_id=p_reward;
  return query select item.cost_points,item.version;
end $$;
create function app_private.release_reward_stock(p_reward uuid,p_quantity integer,p_fulfilled boolean)
returns boolean language plpgsql security definer set search_path=pg_catalog,app_private as $$
begin
  if p_quantity not between 1 and 20 then return false; end if;
  update app_private.reward_inventory set reserved=reserved-p_quantity,
    on_hand=on_hand-case when p_fulfilled then p_quantity else 0 end
    where reward_id=p_reward and reserved>=p_quantity;
  return found;
end $$;
revoke all on function app_private.reserve_reward_stock(uuid,integer),
  app_private.release_reward_stock(uuid,integer,boolean) from public;
grant execute on function app_private.reserve_reward_stock(uuid,integer),
  app_private.release_reward_stock(uuid,integer,boolean) to bluesteps_runtime;
