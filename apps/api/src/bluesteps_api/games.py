from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter
from pydantic import AwareDatetime, Field

from .common import idempotent, not_found, wire
from .db import one, rows, run
from .errors import APIError
from .loyalty import credit, locked_wallet
from .member import DB, Key, User
from .schemas import Model

router = APIRouter(prefix="/v1/games", tags=["games"])
ANSWERS = (0, 0, 1, 1, 2, 2)
ROUND_TIME = timedelta(minutes=3)


class CreateRoom(Model):
    scheduled_at: AwareDatetime | None = None


class JoinRoom(Model):
    code: str = Field(pattern=r"^[A-F0-9]{12}$")


class SubmitRound(Model):
    answers: list[Literal[0, 1, 2]] = Field(min_length=6, max_length=6)


class Player(Model):
    id: UUID
    name: str
    score: int | None
    submitted_at: datetime | None


class Room(Model):
    id: UUID
    code: str
    host_id: UUID
    scheduled_at: datetime | None
    started_at: datetime | None
    ends_at: datetime | None
    phase: Literal["lobby", "playing", "finished"]
    players: list[Player]
    own_answers: list[int] | None
    own_reward_points: int


def read_room(db: DB, user_id: UUID, room_id: UUID, lock: bool = False) -> dict[str, Any]:
    room = one(
        db,
        """select r.id,r.code,r.host_id,r.scheduled_at,r.started_at from app_private.game_rooms r
        where r.id=:id and exists(select 1 from app_private.game_room_players p
          where p.room_id=r.id and p.user_id=:uid)"""
        + (" for update" if lock else ""),
        id=room_id,
        uid=user_id,
    )
    if not room:
        raise not_found()
    players = rows(
        db,
        """select p.user_id as id,pr.display_name as name,p.score,p.submitted_at,p.answers
        from app_private.game_room_players p join app_private.profiles pr on pr.user_id=p.user_id
        where p.room_id=:id order by p.score desc nulls last,p.submitted_at,p.joined_at,p.user_id""",
        id=room_id,
    )
    started = room["started_at"]
    reward = one(
        db,
        """select delta from app_private.point_ledger
        where user_id=:uid and source_id=:id and source_type='green_mission' and entry_kind='earn'""",
        uid=user_id,
        id=room_id,
    )
    ends = started + ROUND_TIME if started else None
    phase = (
        "lobby"
        if not ends
        else "finished"
        if ends <= datetime.now(UTC) or all(p["submitted_at"] for p in players)
        else "playing"
    )
    return wire(
        {
            **room,
            "ends_at": ends,
            "phase": phase,
            "players": [{k: v for k, v in p.items() if k != "answers"} for p in players],
            "own_answers": next(p["answers"] for p in players if p["id"] == user_id),
            "own_reward_points": reward["delta"] if reward else 0,
        }
    )


@router.post("/rooms", response_model=Room, status_code=201, operation_id="game_room_create")
def create_room(body: CreateRoom, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        now = datetime.now(UTC)
        if body.scheduled_at and not now < body.scheduled_at <= now + timedelta(days=30):
            raise APIError(422, "INVALID_GAME_TIME", "Chọn giờ trong 30 ngày tới.")
        room = one(
            db,
            "insert into app_private.game_rooms(host_id,scheduled_at) values (:uid,:time) returning id",
            uid=actor.user_id,
            time=body.scheduled_at,
        )
        assert room
        run(
            db,
            "insert into app_private.game_room_players(room_id,user_id) values (:id,:uid)",
            id=room["id"],
            uid=actor.user_id,
        )
        return read_room(db, actor.user_id, room["id"])

    return idempotent(db, actor.user_id, "game_room_create", key, body.model_dump(), effect)


@router.post("/rooms/join", response_model=Room, operation_id="game_room_join")
def join_room(body: JoinRoom, db: DB, actor: User) -> Any:
    room = one(db, "select id,started_at from app_private.game_rooms where code=:code for update", code=body.code)
    if not room:
        raise not_found()
    if one(
        db,
        "select 1 from app_private.game_room_players where room_id=:id and user_id=:uid",
        id=room["id"],
        uid=actor.user_id,
    ):
        return read_room(db, actor.user_id, room["id"])
    count = one(db, "select count(*) as total from app_private.game_room_players where room_id=:id", id=room["id"])
    if room["started_at"] or (count and count["total"] >= 5):
        raise APIError(409, "GAME_ROOM_CLOSED", "Phòng đã đủ người hoặc đã bắt đầu.")
    run(
        db,
        "insert into app_private.game_room_players(room_id,user_id) values (:id,:uid)",
        id=room["id"],
        uid=actor.user_id,
    )
    return read_room(db, actor.user_id, room["id"])


@router.get("/rooms/{id}", response_model=Room, operation_id="game_room_get")
def get_room(id: UUID, db: DB, actor: User) -> Any:
    return read_room(db, actor.user_id, id)


@router.get("/rooms", response_model=list[Room], operation_id="game_rooms_mine")
def my_rooms(db: DB, actor: User) -> Any:
    joined = rows(
        db,
        """select room_id from app_private.game_room_players
        where user_id=:uid order by joined_at desc,room_id limit 10""",
        uid=actor.user_id,
    )
    return [read_room(db, actor.user_id, entry["room_id"]) for entry in joined]


@router.post("/rooms/{id}/start", response_model=Room, operation_id="game_room_start")
def start_room(id: UUID, db: DB, actor: User) -> Any:
    room = read_room(db, actor.user_id, id, lock=True)
    if room["hostId"] != str(actor.user_id):
        raise APIError(403, "GAME_HOST_REQUIRED", "Chỉ chủ phòng có thể bắt đầu.")
    if room["startedAt"]:
        return room
    if not one(
        db,
        """update app_private.game_rooms set started_at=clock_timestamp() where id=:id
        and (scheduled_at is null or scheduled_at<=clock_timestamp()) returning id""",
        id=id,
    ):
        raise APIError(409, "GAME_NOT_DUE", "Chưa đến giờ bắt đầu theo lịch.")
    return read_room(db, actor.user_id, id)


@router.post("/rooms/{id}/submit", response_model=Room, operation_id="game_room_submit")
def submit_room(id: UUID, body: SubmitRound, db: DB, actor: User) -> Any:
    room = read_room(db, actor.user_id, id, lock=True)
    if room["ownAnswers"] is not None:
        return room
    if room["phase"] != "playing":
        raise APIError(409, "GAME_ROUND_CLOSED", "Lượt chơi chưa bắt đầu hoặc đã hết giờ.")
    score = sum(a == b for a, b in zip(body.answers, ANSWERS, strict=True))
    if not one(
        db,
        """update app_private.game_room_players set score=:score,answers=cast(:answers as smallint[]),
        submitted_at=statement_timestamp() where room_id=:id and user_id=:uid
        and statement_timestamp() < (select started_at + interval '3 minutes' from app_private.game_rooms where id=:id)
        returning user_id""",
        id=id,
        uid=actor.user_id,
        score=score,
        answers=body.answers,
    ):
        raise APIError(409, "GAME_ROUND_CLOSED", "Lượt chơi đã hết giờ.")
    if score == len(ANSWERS):
        award_perfect_round(db, actor.user_id, id)
    return read_room(db, actor.user_id, id)


def award_perfect_round(db: DB, user_id: UUID, room_id: UUID) -> None:
    rule = one(db, "select timezone from app_private.reward_program where id and enabled")
    if not rule:
        return
    # Serialize with awards from other rooms for the same player.
    locked_wallet(db, user_id)
    already_awarded = one(
        db,
        """select 1 from app_private.point_ledger
        where user_id=:uid and source_type='green_mission' and entry_kind='earn'
        and timezone(:zone,created_at)::date=timezone(:zone,now())::date limit 1""",
        uid=user_id,
        zone=rule["timezone"],
    )
    if not already_awarded:
        credit(db, user_id, "green_mission", room_id, 1)
