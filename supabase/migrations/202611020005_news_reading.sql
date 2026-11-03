create table app_private.article_reading (
  user_id uuid not null references app_private.users,
  article_id uuid not null references app_private.articles,
  progress integer not null default 0 check(progress between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key(user_id,article_id)
);
create table app_private.article_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_private.users,
  term text not null check(length(term) between 1 and 100),
  created_at timestamptz not null default now()
);
create unique index article_searches_term on app_private.article_searches(user_id,lower(term));
create index article_searches_recent on app_private.article_searches(user_id,created_at desc,id desc);
do $$ declare name text; begin
  foreach name in array array['article_reading','article_searches'] loop
    execute format('alter table app_private.%I enable row level security',name);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',name);
    execute format('revoke all on app_private.%I from public',name);
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',name);
  end loop;
end $$;
