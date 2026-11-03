"""Manually requested community demo content; never run on application startup."""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import Connection, text

from .security import passwords

MEMBERS = [
    ("mai-anh", "Mai Anh", "Thích mang bình nước và túi vải mỗi ngày."),
    ("minh-khang", "Minh Khang", "Cùng thực hành phân loại và tái sử dụng đồ cũ."),
    ("linh-chi", "Linh Chi", "Gieo một mầm cây, giữ một thói quen xanh."),
]
POSTS = [
    (
        "binh-nuoc",
        0,
        "Giảm nhựa",
        "Một tuần mang bình nước cá nhân 🌿\n\n"
        "Mình để bình ngay cạnh chìa khóa để sáng nào cũng nhớ mang theo. "
        "Khi mua đồ uống, mình hỏi quán trước xem có thể dùng bình riêng không. "
        "Một thay đổi nhỏ nhưng rất dễ duy trì!\n\nBạn có mẹo nào để bớt quên bình nước không?",
        "Mình cũng để bình trong túi đi làm từ tối hôm trước, sáng đỡ quên hẳn!",
        "Hay quá! Mình sẽ thử chuẩn bị từ tối nay. Cảm ơn bạn nhé.",
    ),
    (
        "goc-phan-loai",
        1,
        "Phân loại rác",
        "Góc phân loại nhỏ trong căn bếp ♻️\n\n"
        "Nhà mình dành một hộp riêng cho giấy sạch và chai nhựa đã làm rỗng, để khô. "
        "Trước khi mang đi, mình xem lại loại vật liệu mà điểm thu gom nhận. "
        "Giấy dính dầu mỡ thì không bỏ chung với giấy sạch.\n\n"
        "Mọi người đang sắp xếp góc phân loại ở nhà như thế nào?",
        "Dán tên vật liệu lên từng hộp cũng dễ nhớ, nhất là khi cả nhà cùng phân loại.",
        "Ý hay đó! Cuối tuần mình sẽ làm thêm vài nhãn dễ đọc cho cả nhà.",
    ),
    (
        "chau-cay",
        2,
        "Tái sử dụng",
        "Chiếc cốc cũ có nhiệm vụ mới 🪴\n\n"
        "Mình tận dụng một chiếc cốc làm vỏ chậu trang trí. Cây vẫn ở trong chậu nhỏ "
        "có lỗ thoát nước để dễ lấy ra tưới, tránh đọng nước trong cốc. "
        "Góc bàn học có thêm chút xanh mà không phải mua vỏ chậu mới.\n\n"
        "Bạn đã từng biến đồ cũ thành món gì hữu ích chưa?",
        "Mình dùng hộp giấy cứng để chia ngăn bàn làm việc. Vừa gọn vừa tận dụng đồ có sẵn.",
        "Một ý tưởng rất dễ thử! Mình còn vài hộp sạch để dành đây.",
    ),
    (
        "tui-vai",
        0,
        "Sống xanh mỗi ngày",
        "Thử thách nhỏ: nhớ túi vải khi đi chợ 🛍️\n\n"
        "Mình gấp một chiếc túi nhỏ để sẵn trong ba lô. Túi dùng xong được giặt khi cần "
        "và phơi khô rồi dùng tiếp. Hôm nào quên, mình thử tận dụng chiếc túi đang có "
        "thay vì lấy thêm.\n\nCùng chọn một thói quen nhỏ để bắt đầu tuần này nhé!",
        "Mình chọn mang túi có sẵn khi mua đồ ăn sáng. Bắt đầu từ một việc thôi cho dễ duy trì.",
        "Cùng thử nhé! Tuần sau quay lại chia sẻ xem mẹo nào hợp với mình nhất.",
    ),
]


def demo_id(kind: str, key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"bluesteps:community-demo:v1:{kind}:{key}")


def _seed_member(conn: Connection, key: str, name: str, bio: str) -> dict[str, int]:
    uid = demo_id("member", key)
    user = conn.execute(
        text("""insert into app_private.users(id,email_normalized,password_hash,status)
        values (:id,:email,:hash,'active') on conflict(id) do nothing"""),
        {
            "id": uid,
            "email": f"{key}@community-demo.bluesteps.invalid",
            "hash": passwords.hash(secrets.token_urlsafe(48)),
        },
    )
    profile = conn.execute(
        text("""insert into app_private.profiles(user_id,display_name,country_code,bio)
        values (:id,:name,'VN',:bio) on conflict(user_id) do nothing"""),
        {"id": uid, "name": name, "bio": bio},
    )
    return {"users": user.rowcount, "profiles": profile.rowcount}


def seed_community_demo(conn: Connection, now: datetime | None = None) -> dict[str, int]:
    """Insert only stable demo IDs, leaving existing accounts and content untouched."""
    anchor = now or datetime.now(UTC)
    counts = {table: 0 for table in ("users", "profiles", "posts", "comments", "reactions")}
    conn.execute(text("select pg_advisory_xact_lock(72192620261104)"))
    for key, name, bio in MEMBERS:
        # Authors must be active for public discovery. These fictional identities
        # have no verified email, known password, sessions or privileged roles.
        for table, count in _seed_member(conn, key, name, bio).items():
            counts[table] += count
    for index, (key, author, topic, body, comment, reply) in enumerate(POSTS):
        pid = demo_id("post", key)
        uid = demo_id("member", MEMBERS[author][0])
        created = anchor - timedelta(hours=index + 1)
        result = conn.execute(
            text("""insert into app_private.posts(id,user_id,body,visibility,topic,created_at)
            values (:id,:uid,:body,'public',:topic,:created) on conflict(id) do nothing"""),
            {"id": pid, "uid": uid, "body": body, "topic": topic, "created": created},
        )
        counts["posts"] += result.rowcount
        for member_index, member in enumerate(MEMBERS):
            if member_index == author:
                continue
            result = conn.execute(
                text("""insert into app_private.reactions(user_id,post_id,created_at)
                values (:uid,:post,:created) on conflict do nothing"""),
                {"uid": demo_id("member", member[0]), "post": pid, "created": created + timedelta(minutes=5)},
            )
            counts["reactions"] += result.rowcount
        parent = demo_id("comment", key)
        for cid, commenter, content, parent_id, minutes in [
            (parent, (author + 1) % len(MEMBERS), comment, None, 10),
            (demo_id("reply", key), author, reply, parent, 15),
        ]:
            result = conn.execute(
                text("""insert into app_private.comments(id,user_id,post_id,parent_id,body,created_at)
                values (:id,:uid,:post,:parent,:body,:created) on conflict(id) do nothing"""),
                {
                    "id": cid,
                    "uid": demo_id("member", MEMBERS[commenter][0]),
                    "post": pid,
                    "parent": parent_id,
                    "body": content,
                    "created": created + timedelta(minutes=minutes),
                },
            )
            counts["comments"] += result.rowcount
    return counts


def seed_personal_community_demo(conn: Connection, viewer: UUID) -> dict[str, int]:
    """Populate five personal views for one explicit account, using fictional peers."""
    conn.execute(text("select pg_advisory_xact_lock(72192620261104)"))
    if not conn.execute(
        text("""select 1 from app_private.users where id=:viewer and status='active'
        and email_verified_at is not null for update"""),
        {"viewer": viewer},
    ).first():
        raise ValueError("An active, verified target account is required")
    peers = [demo_id("member", key) for key, _, _ in MEMBERS]
    if conn.execute(
        text("""select 1 from app_private.blocks where
        (user_id=:viewer and blocked_user_id=any(cast(:peers as uuid[]))) or
        (blocked_user_id=:viewer and user_id=any(cast(:peers as uuid[]))) limit 1"""),
        {"viewer": viewer, "peers": peers},
    ).first():
        raise ValueError("Existing blocks conflict with the selected demo content")
    # The blocked peer is separate from the authors of the saved, hidden and
    # followed posts, and from the accepted friend, so every view stays usable.
    counts = _seed_member(conn, "tuan-phong", "Tuấn Phong", "Hồ sơ minh họa danh sách đã chặn.")
    for table, column, target in [
        ("member_follows", "followed_user_id", demo_id("member", "minh-khang")),
        ("saved_posts", "post_id", demo_id("post", "binh-nuoc")),
        ("hidden_posts", "post_id", demo_id("post", "chau-cay")),
        ("blocks", "blocked_user_id", demo_id("member", "tuan-phong")),
    ]:
        result = conn.execute(
            text(f"insert into app_private.{table}(user_id,{column}) values (:viewer,:target) on conflict do nothing"),
            {"viewer": viewer, "target": target},
        )
        counts[table] = result.rowcount
    friend = demo_id("member", "mai-anh")
    params = {"viewer": viewer, "friend": friend}
    result = conn.execute(
        text("""insert into app_private.friendships(requester_id,recipient_id,accepted_at)
        values (:friend,:viewer,now()) on conflict do nothing"""),
        params,
    )
    counts["friendships"] = result.rowcount
    # Only accept an existing request between this account and the demo peer.
    result = conn.execute(
        text("""update app_private.friendships set accepted_at=now() where accepted_at is null
        and ((requester_id=:viewer and recipient_id=:friend) or
        (requester_id=:friend and recipient_id=:viewer))"""),
        params,
    )
    counts["friendships"] += result.rowcount
    return counts
