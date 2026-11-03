-- A deleted/recreated draft must never reuse a version held by an older tab.
create sequence app_private.post_draft_version_seq as integer;
select setval('app_private.post_draft_version_seq',
  greatest(coalesce((select max(version) from app_private.post_drafts),0)+1,1),false);
alter table app_private.post_drafts alter column version
  set default nextval('app_private.post_draft_version_seq');
revoke all on sequence app_private.post_draft_version_seq from public;
grant usage on sequence app_private.post_draft_version_seq to bluesteps_runtime;
