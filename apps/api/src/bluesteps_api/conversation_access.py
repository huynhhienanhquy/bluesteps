"""The same member/block/active-account gate protects messages and their private bytes."""

CONVERSATION_ACCESS = """exists(select 1 from app_private.conversation_members member
  where member.conversation_id=c.id and member.user_id=cast(:viewer as uuid))
  and not exists(select 1 from app_private.conversation_members other
    join app_private.users participant on participant.id=other.user_id
    where other.conversation_id=c.id and (participant.status<>'active' or exists(
      select 1 from app_private.blocks b where
      (b.user_id=cast(:viewer as uuid) and b.blocked_user_id=other.user_id) or
      (b.blocked_user_id=cast(:viewer as uuid) and b.user_id=other.user_id))))"""

MESSAGE_MEDIA_JSON = """coalesce((select jsonb_agg(jsonb_build_object(
  'id',a.id,'kind',a.kind,'fileName',a.file_name,'mimeType',a.mime_type,'size',a.size,
  'width',a.width,'height',a.height,'durationMs',a.duration_ms) order by mm.position)
  from app_private.message_media mm join app_private.media_assets a on a.id=mm.asset_id
  where mm.message_id=m.id and a.completed_at is not null),'[]') as media"""
