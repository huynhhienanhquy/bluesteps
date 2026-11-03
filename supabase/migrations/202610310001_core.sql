-- Canonical migration chain. Run as the migration owner, never the API role.
create schema if not exists app_private;
revoke all on schema app_private from public;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'bluesteps_runtime') then
    create role bluesteps_runtime nologin nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;
alter default privileges in schema app_private revoke all on tables from public;
alter default privileges in schema app_private revoke execute on functions from public;

create table app_private.users (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique check (length(email_normalized) <= 254),
  password_hash text not null,
  status text not null check (status in ('pending', 'active', 'locked', 'deleted')),
  email_verified_at timestamptz,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);
create table app_private.profiles (
  user_id uuid primary key references app_private.users(id),
  display_name text not null check (length(display_name) between 1 and 100),
  birth_date date, country_code text check (country_code ~ '^[A-Z]{2}$'),
  bio text not null default '' check (length(bio) <= 500),
  version integer not null default 1 check (version > 0)
);
create table app_private.user_preferences (
  user_id uuid primary key references app_private.users(id),
  theme text not null default 'system' check (theme in ('system','light','dark')),
  sound boolean not null default true, haptics boolean not null default true,
  locale text not null default 'vi' check (locale in ('vi','en')),
  version integer not null default 1 check (version > 0)
);
create table app_private.consent_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  purpose text not null, policy_version text not null,
  accepted_at timestamptz not null default now()
);
create table app_private.sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  device_label text, created_at timestamptz not null default now(),
  last_seen_at timestamptz, expires_at timestamptz not null, revoked_at timestamptz
);
create index sessions_owner on app_private.sessions(user_id, created_at desc, id);
create table app_private.refresh_tokens (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references app_private.sessions,
  token_hash text not null unique, parent_token_id uuid unique references app_private.refresh_tokens,
  issued_at timestamptz not null default now(), expires_at timestamptz not null,
  consumed_at timestamptz
);
create index refresh_session on app_private.refresh_tokens(session_id);
create table app_private.auth_challenges (
  id uuid primary key default gen_random_uuid(), user_id uuid references app_private.users,
  recipient_hash text not null, purpose text not null
    check (purpose in ('verify_email','password_reset','email_change')),
  code_hmac text not null, reset_token_hash text unique,
  expires_at timestamptz not null, attempt_count integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts > 0),
  consumed_at timestamptz, created_at timestamptz not null default now(),
  check (attempt_count between 0 and max_attempts)
);
create table app_private.rate_limits (
  scope text not null, subject_hash text not null, bucket bigint not null,
  attempts integer not null check (attempts > 0),
  primary key(scope,subject_hash,bucket)
);
create table app_private.user_roles (
  user_id uuid not null references app_private.users,
  role text not null check (role in ('moderator','editor','reward_operator','admin')),
  primary key(user_id,role)
);
create table app_private.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references app_private.users,
  action text not null, target_id uuid, reason text, request_id text not null,
  occurred_at timestamptz not null default now()
);
create table app_private.outbox_events (
  id uuid primary key default gen_random_uuid(), aggregate_id uuid not null,
  event_type text not null, payload jsonb not null default '{}',
  occurred_at timestamptz not null default now(), published_at timestamptz,
  attempt_count integer not null default 0, available_at timestamptz not null default now()
);
create index outbox_pending on app_private.outbox_events(available_at,id)
  where published_at is null;
create table app_private.consumer_receipts (
  consumer text not null, event_id uuid not null references app_private.outbox_events,
  processed_at timestamptz not null default now(), primary key(consumer,event_id)
);
create table app_private.idempotency_records (
  actor_id uuid not null references app_private.users, operation text not null,
  key text not null check (length(key) between 1 and 128), request_hash text not null,
  response_safe jsonb not null, created_at timestamptz not null default now(),
  primary key(actor_id,operation,key)
);

create table app_private.waste_categories (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, sort_order integer not null default 0
);
create table app_private.waste_materials (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, hazardous boolean not null default false
);
create table app_private.waste_items (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, category_id uuid not null references app_private.waste_categories,
  material_id uuid not null references app_private.waste_materials,
  icon text not null default 'leaf-outline', steps jsonb not null default '[]',
  sources jsonb not null default '[]', revision integer not null default 1,
  published boolean not null default false, synthetic boolean not null default false,
  created_at timestamptz not null default now()
);
create table app_private.scans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  status text not null check (status in ('queued','processing','completed','failed','unrecognized')),
  created_at timestamptz not null default now()
);
create table app_private.sorting_actions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  item_id uuid not null references app_private.waste_items, scan_id uuid unique references app_private.scans,
  source text not null check (source in ('manual','scan')),
  evidence_status text not null check (evidence_status in ('self_reported','user_confirmed')),
  created_at timestamptz not null default now(),
  check ((source = 'scan') = (scan_id is not null))
);
create table app_private.wallets (
  user_id uuid primary key references app_private.users,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  version integer not null default 1 check (version > 0)
);
create table app_private.point_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.wallets,
  delta bigint not null check (delta <> 0), balance_after bigint not null check (balance_after >= 0),
  entry_kind text not null check (entry_kind in ('earn','spend','refund','reversal')),
  source_type text not null, source_id uuid not null,
  reverses_entry_id uuid unique references app_private.point_ledger,
  created_at timestamptz not null default now(),
  unique(user_id,source_type,source_id,entry_kind)
);
create index ledger_owner_page on app_private.point_ledger(user_id,created_at desc,id desc);
create table app_private.rewards (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, description text not null, category text not null,
  cost_points bigint not null check (cost_points > 0),
  state text not null check (state in ('draft','published','paused','retired')),
  synthetic boolean not null default false, version integer not null default 1,
  created_at timestamptz not null default now()
);
create table app_private.reward_inventory (
  reward_id uuid primary key references app_private.rewards,
  on_hand integer not null default 0, reserved integer not null default 0,
  check (on_hand >= 0 and reserved >= 0 and reserved <= on_hand)
);
create table app_private.redemptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  reward_id uuid not null references app_private.rewards, quantity integer not null check (quantity > 0),
  unit_cost_snapshot bigint not null check (unit_cost_snapshot > 0),
  total_cost bigint not null, status text not null
    check (status in ('reserved','fulfilling','fulfilled','needs_review','refunded')),
  original_debit_id uuid not null unique references app_private.point_ledger,
  created_at timestamptz not null default now(), check (total_cost = quantity * unit_cost_snapshot)
);

create table app_private.collection_points (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, address text not null, area text not null default '',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  hours text not null default '', timezone text not null default 'Asia/Ho_Chi_Minh',
  published boolean not null default false, synthetic boolean not null default false,
  version integer not null default 1, created_at timestamptz not null default now()
);
create table app_private.point_materials (
  point_id uuid not null references app_private.collection_points,
  material_id uuid not null references app_private.waste_materials,
  primary key(point_id,material_id)
);
create table app_private.point_reviews (
  id uuid primary key default gen_random_uuid(), point_id uuid not null references app_private.collection_points,
  user_id uuid not null references app_private.users, rating smallint not null check (rating between 1 and 5),
  body text not null check (length(body) between 1 and 1000),
  state text not null default 'pending' check (state in ('pending','published','rejected')),
  created_at timestamptz not null default now(), unique(point_id,user_id)
);
create table app_private.point_proposals (
  id uuid primary key default gen_random_uuid(), submitted_by uuid not null references app_private.users,
  name text not null, address text not null, latitude double precision not null,
  longitude double precision not null, material_ids jsonb not null,
  state text not null default 'draft' check (state in ('draft','submitted','approved','rejected')),
  version integer not null default 1, reviewed_by uuid references app_private.users,
  review_reason text, reviewed_at timestamptz, published_point_id uuid references app_private.collection_points,
  created_at timestamptz not null default now()
);
create table app_private.point_reports (
  id uuid primary key default gen_random_uuid(), point_id uuid not null references app_private.collection_points,
  submitted_by uuid not null references app_private.users, issue_types jsonb not null,
  description text not null, observed_at timestamptz not null,
  state text not null default 'submitted' check (state in ('submitted','approved','rejected')),
  version integer not null default 1, reviewed_by uuid references app_private.users,
  review_reason text, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table app_private.routes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  mode text not null check (mode in ('walking','cycling','driving')),
  status text not null default 'draft' check (status in ('draft','active','cancelled','completed')),
  version integer not null default 1, created_at timestamptz not null default now()
);
create table app_private.route_stops (
  id uuid primary key default gen_random_uuid(), route_id uuid not null references app_private.routes,
  point_id uuid not null references app_private.collection_points,
  position integer not null check (position >= 0), status text not null default 'pending'
    check (status in ('pending','arrived','self_reported')),
  unique(route_id,position) deferrable initially deferred, unique(route_id,point_id)
);

create table app_private.events (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  title text not null, description text not null, location text not null,
  topic text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  capacity integer not null check (capacity >= 0), reserved_count integer not null default 0,
  published boolean not null default false, synthetic boolean not null default false,
  details jsonb not null default '{}', version integer not null default 1,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at), check (reserved_count between 0 and capacity)
);
create index event_time on app_private.events(starts_at,id) where published;
create table app_private.event_collections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  name text not null check (length(name) between 1 and 100), version integer not null default 1,
  created_at timestamptz not null default now(), unique(id,user_id)
);
create table app_private.saved_events (
  user_id uuid not null references app_private.users, event_id uuid not null references app_private.events,
  collection_id uuid, created_at timestamptz not null default now(),
  primary key(user_id,event_id),
  foreign key(collection_id,user_id) references app_private.event_collections(id,user_id)
);
create table app_private.articles (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  title text not null, summary text not null, topic text not null,
  blocks jsonb not null default '[]', sources jsonb not null default '[]',
  published boolean not null default false, synthetic boolean not null default false,
  created_at timestamptz not null default now()
);
create table app_private.saved_articles (
  user_id uuid not null references app_private.users, article_id uuid not null references app_private.articles,
  created_at timestamptz not null default now(), primary key(user_id,article_id)
);
create table app_private.posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  body text not null check (length(body) between 1 and 5000),
  visibility text not null check (visibility in ('public','private')),
  deleted_at timestamptz, version integer not null default 1,
  created_at timestamptz not null default now()
);
create index posts_feed on app_private.posts(created_at desc,id desc) where deleted_at is null;
create table app_private.blocks (
  user_id uuid not null references app_private.users, blocked_user_id uuid not null references app_private.users,
  primary key(user_id,blocked_user_id), check (user_id <> blocked_user_id)
);
create table app_private.reactions (
  user_id uuid not null references app_private.users, post_id uuid not null references app_private.posts,
  created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table app_private.comments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  post_id uuid references app_private.posts, article_id uuid references app_private.articles,
  parent_id uuid references app_private.comments, body text not null check (length(body) between 1 and 500),
  deleted_at timestamptz, created_at timestamptz not null default now(),
  check ((post_id is not null)::int + (article_id is not null)::int = 1)
);
create table app_private.conversations (
  id uuid primary key default gen_random_uuid(), direct_key text not null unique,
  last_sequence bigint not null default 0, created_at timestamptz not null default now()
);
create table app_private.conversation_members (
  conversation_id uuid not null references app_private.conversations,
  user_id uuid not null references app_private.users, last_read_sequence bigint not null default 0,
  primary key(conversation_id,user_id), check (last_read_sequence >= 0)
);
create table app_private.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references app_private.conversations,
  user_id uuid not null references app_private.users, client_message_id uuid not null,
  sequence bigint not null check (sequence > 0), body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key(conversation_id,user_id) references app_private.conversation_members,
  unique(conversation_id,sequence), unique(conversation_id,user_id,client_message_id)
);
create table app_private.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app_private.users,
  event_id uuid unique references app_private.outbox_events, title text not null,
  body text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create index notification_owner on app_private.notifications(user_id,created_at desc,id desc);
