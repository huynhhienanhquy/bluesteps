create table app_private.comment_reactions (
  user_id uuid not null references app_private.users,
  comment_id uuid not null references app_private.comments,
  created_at timestamptz not null default now(),
  primary key(user_id,comment_id)
);
alter table app_private.comment_reactions enable row level security;
create policy runtime_only on app_private.comment_reactions to bluesteps_runtime using (true) with check(true);
revoke all on app_private.comment_reactions from public;
grant select,insert,delete on app_private.comment_reactions to bluesteps_runtime;
