"""Shared ACL used by post reads, counts, comments and private media downloads."""

POST_ACCESS = """p.deleted_at is null and author.status='active'
  and (p.visibility='public' or p.user_id=cast(:viewer as uuid)
    or (p.visibility='friends' and exists(select 1 from app_private.friendships f
      where f.accepted_at is not null and
      ((f.requester_id=p.user_id and f.recipient_id=cast(:viewer as uuid))
      or (f.recipient_id=p.user_id and f.requester_id=cast(:viewer as uuid))))))
  and not exists(select 1 from app_private.blocks b where
    (b.user_id=cast(:viewer as uuid) and b.blocked_user_id=p.user_id)
    or (b.user_id=p.user_id and b.blocked_user_id=cast(:viewer as uuid)))"""

MEDIA_JSON = """coalesce((select jsonb_agg(jsonb_build_object(
  'id',a.id,'kind',a.kind,'fileName',a.file_name,'mimeType',a.mime_type,'size',a.size,
  'width',a.width,'height',a.height,'durationMs',a.duration_ms) order by pm.position)
  from app_private.post_media pm join app_private.media_assets a on a.id=pm.asset_id
  where pm.post_id=p.id and a.completed_at is not null),'[]') as media"""
