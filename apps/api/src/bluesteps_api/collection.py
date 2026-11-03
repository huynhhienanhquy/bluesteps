import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .catalog import Cursor, Limit, point_get
from .collection_evidence import bind_evidence, evidence, public_point_photos
from .common import idempotent, not_found, outbox, page, wire
from .db import db_session, one, rows, run
from .errors import APIError
from .member import Key
from .schemas import (
    CollectionPoint,
    MediaAsset,
    Page,
    PointHandoverUpdate,
    PointOperationUpdate,
    PointReview,
    PointReviewRequest,
    ProposalDetail,
    ProposalRequest,
    ProposalSubmit,
    ProposalUpdate,
    ReportDetail,
    ReportRequest,
    ReviewDecision,
    ReviewResult,
    RouteDetail,
    RoutePlan,
    RoutePlanRequest,
    RoutePreviewRequest,
    RouteRequest,
    RouteUpdate,
    StopReplacement,
)
from .security import Actor, current_actor, require_role

router = APIRouter(prefix="/v1", tags=["collection"])
DB = Annotated[Session, Depends(db_session, scope="function")]
User = Annotated[Actor, Depends(current_actor)]
PROPOSAL_COLUMNS = (
    "id,name,address,latitude,longitude,material_ids,hours,state,version,review_reason,"
    "published_point_id,submitted_at,created_at,publish_photos"
)
REPORT_COLUMNS = "id,point_id,issue_types,description,observed_at,state,version,review_reason,created_at"


@router.get("/me/collection-moderation", operation_id="collection_moderation_access")
def moderation_access(db: DB, actor: User) -> dict[str, bool]:
    role = one(
        db,
        "select 1 from app_private.user_roles where user_id=:uid and role='moderator'",
        uid=actor.user_id,
    )
    return {"allowed": role is not None}


@router.patch(
    "/admin/collection-points/{id}/handover-guidance",
    response_model=CollectionPoint,
    operation_id="collection_point_handover_update",
)
def update_handover_guidance(id: UUID, body: PointHandoverUpdate, request: Request, db: DB, actor: User) -> Any:
    require_role(db, actor, "moderator")
    reason = body.reason.strip()
    if not reason:
        raise APIError(422, "REASON_REQUIRED", "Nhập lý do cập nhật.")
    updated = one(
        db,
        """update app_private.collection_points set
        entrance_label=case when :set_entrance then :entrance else entrance_label end,
        handover_instructions=case when :set_instructions then :instructions else handover_instructions end,
        contact_phone=case when :set_phone then :phone else contact_phone end,
        website_url=case when :set_website then :website else website_url end,version=version+1
        where id=:id and version=:version and published and not synthetic returning id""",
        id=id,
        version=body.expected_version,
        set_entrance="entrance_label" in body.model_fields_set,
        entrance=(body.entrance_label or "").strip() or None,
        set_instructions="handover_instructions" in body.model_fields_set,
        instructions=(body.handover_instructions or "").strip() or None,
        set_phone="contact_phone" in body.model_fields_set,
        phone=body.contact_phone,
        set_website="website_url" in body.model_fields_set,
        website=body.website_url,
    )
    if not updated:
        point_get(id, db)
        raise APIError(409, "VERSION_CONFLICT", "Thông tin điểm đã thay đổi. Tải lại trước khi cập nhật.")
    run(
        db,
        """insert into app_private.audit_logs(actor_id,action,target_id,reason,request_id)
        values (:actor,'collection_point.handover_guidance',:id,:reason,:request)""",
        actor=actor.user_id,
        id=id,
        reason=reason,
        request=request.state.request_id,
    )
    return point_get(id, db)


@router.put(
    "/admin/collection-points/{id}/operations",
    response_model=CollectionPoint,
    operation_id="collection_point_operations_update",
)
def operations_update(id: UUID, body: PointOperationUpdate, request: Request, db: DB, actor: User) -> Any:
    require_role(db, actor, "moderator")
    record = one(
        db,
        "select version from app_private.collection_points where id=:id and published and not synthetic for update",
        id=id,
    )
    if not record:
        raise not_found()
    if record["version"] != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Thông tin điểm đã thay đổi. Tải lại trước khi cập nhật.")
    observed, expires = body.status_observed_at, body.status_expires_at
    if body.capacity_state != "unknown":
        if (
            not observed
            or not expires
            or not observed.tzinfo
            or not expires.tzinfo
            or not observed <= datetime.now(UTC) < expires <= observed + timedelta(hours=24)
        ):
            raise APIError(
                422,
                "INVALID_OBSERVATION",
                "Trạng thái cần thời điểm xác nhận, hết hạn trong 24 giờ và không ở tương lai.",
            )
    else:
        observed, expires = None, None
    windows = body.opening_hours or []
    if len({(w.weekday, w.start_min) for w in windows}) != len(windows):
        raise APIError(422, "DUPLICATE_HOURS", "Giờ hoạt động bị lặp.")
    run(db, "delete from app_private.point_opening_hours where point_id=:id", id=id)
    for window in windows:
        run(
            db,
            "insert into app_private.point_opening_hours(point_id,weekday,start_min,end_min) "
            "values (:id,:day,:start,:end)",
            id=id,
            day=window.weekday,
            start=window.start_min,
            end=window.end_min,
        )
    run(
        db,
        """update app_private.collection_points set staffed=:staffed,always_open=:always_open,
        schedule_known=:known,capacity_state=:capacity,status_observed_at=:observed,status_expires_at=:expires,
        entrance_label=case when :set_entrance then :entrance else entrance_label end,
        handover_instructions=case when :set_instructions then :instructions else handover_instructions end,
        contact_phone=case when :set_phone then :phone else contact_phone end,
        website_url=case when :set_website then :website else website_url end,
        version=version+1 where id=:id""",
        id=id,
        staffed=body.staffed,
        always_open=body.always_open,
        known=body.opening_hours is not None,
        capacity=body.capacity_state,
        observed=observed,
        expires=expires,
        set_entrance="entrance_label" in body.model_fields_set,
        entrance=(body.entrance_label or "").strip() or None,
        set_instructions="handover_instructions" in body.model_fields_set,
        instructions=(body.handover_instructions or "").strip() or None,
        set_phone="contact_phone" in body.model_fields_set,
        phone=body.contact_phone,
        set_website="website_url" in body.model_fields_set,
        website=body.website_url,
    )
    run(
        db,
        """insert into app_private.audit_logs(actor_id,action,target_id,reason,request_id)
        values (:actor,'collection_point.operations',:id,:reason,:request)""",
        actor=actor.user_id,
        id=id,
        reason=body.reason,
        request=request.state.request_id,
    )
    return point_get(id, db)


@router.get("/collection-points/{id}/reviews", response_model=Page[PointReview], operation_id="point_reviews_list")
def point_reviews(id: UUID, db: DB, cursor: Cursor = None, limit: Limit = 20) -> Any:
    point_get(id, db)
    return page(
        db,
        f"point-reviews:{id}",
        """select r.id,r.rating,r.body,r.created_at,
      p.display_name as author_name from app_private.point_reviews r
      join app_private.profiles p on p.user_id=r.user_id
      where r.point_id=:id and r.state='published'""",
        {"id": id},
        cursor=cursor,
        limit=limit,
    )


@router.get("/collection-points/{id}/photos", response_model=list[MediaAsset], operation_id="point_photos_list")
def point_photos(id: UUID, db: DB) -> Any:
    point_get(id, db)
    return public_point_photos(db, id)


@router.post("/collection-points/{id}/reviews", status_code=201, operation_id="point_review_create")
def point_review(id: UUID, body: PointReviewRequest, db: DB, actor: User) -> Any:
    point_get(id, db)
    return wire(
        one(
            db,
            """insert into app_private.point_reviews(point_id,user_id,rating,body)
      values (:id,:uid,:rating,:body) on conflict(point_id,user_id) do update
      set rating=excluded.rating,body=excluded.body,state='pending'
      returning id,rating,body,state,created_at""",
            id=id,
            uid=actor.user_id,
            rating=body.rating,
            body=body.body,
        )
    )


@router.post(
    "/collection-points/{id}/reports", response_model=ReportDetail, status_code=201, operation_id="point_report_create"
)
def report(id: UUID, body: ReportRequest, db: DB, actor: User, key: Key = None) -> Any:
    point_get(id, db)
    if body.observed_at.tzinfo is None or body.observed_at > datetime.now(UTC):
        raise APIError(422, "INVALID_OBSERVED_AT", "Thời điểm quan sát cần múi giờ và không ở tương lai.")

    def effect() -> dict[str, Any]:
        result = one(
            db,
            """insert into app_private.point_reports
          (point_id,submitted_by,issue_types,description,observed_at)
          values (:id,:uid,cast(:issues as jsonb),:description,:observed)
          returning id,state,version,created_at""",
            id=id,
            uid=actor.user_id,
            issues=json.dumps(body.issue_types),
            description=body.description,
            observed=body.observed_at,
        )
        assert result is not None
        bind_evidence(db, actor, "report", result["id"], body.media_ids)
        outbox(db, result["id"], "point.reported", {"pointId": id})
        return dict(report_get(result["id"], db, actor))

    return idempotent(db, actor.user_id, f"point_report:{id}", key, body.model_dump(), effect)


@router.post("/point-proposals", response_model=ProposalDetail, status_code=201, operation_id="point_proposal_create")
def proposal(body: ProposalRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        validate_proposal(db, body)
        result = one(
            db,
            """insert into app_private.point_proposals
          (submitted_by,name,address,latitude,longitude,material_ids,hours,publish_photos)
          values (:uid,:name,:address,:lat,:lng,cast(:materials as jsonb),:hours,:publish_photos) returning id,state,version""",
            uid=actor.user_id,
            name=body.name,
            address=body.address,
            lat=body.latitude,
            lng=body.longitude,
            materials=json.dumps([str(id) for id in body.material_ids]),
            hours=body.hours.strip(),
            publish_photos=body.publish_photos,
        )
        assert result is not None
        bind_evidence(db, actor, "proposal", result["id"], body.media_ids)
        return dict(proposal_get(result["id"], db, actor))

    fingerprint = body.model_dump()
    if "publish_photos" not in body.model_fields_set:
        fingerprint.pop("publish_photos")
    return idempotent(db, actor.user_id, "point_proposal_create", key, fingerprint, effect)


def validate_proposal(db: Session, body: ProposalRequest) -> None:
    found = rows(
        db, "select id from app_private.waste_materials where id=any(cast(:ids as uuid[]))", ids=body.material_ids
    )
    if len(found) != len(body.material_ids) or not body.name.strip() or not body.address.strip():
        raise APIError(422, "INVALID_PROPOSAL", "Kiểm tra tên, địa chỉ và các vật liệu không trùng nhau.")


@router.get("/me/point-proposals", response_model=Page[ProposalDetail], operation_id="point_proposals_list")
def proposals_list(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    result = page(
        db,
        f"proposals:{actor.user_id}",
        f"select {PROPOSAL_COLUMNS} from app_private.point_proposals where submitted_by=:uid",
        {"uid": actor.user_id},
        cursor=cursor,
        limit=limit,
    )
    for item in result["items"]:
        item.update(wire(evidence(db, "proposal", item["id"])))
    return result


@router.get("/point-proposals/{id}", response_model=ProposalDetail, operation_id="point_proposal_get")
def proposal_get(id: UUID, db: DB, actor: User) -> Any:
    result = one(
        db,
        f"""select {PROPOSAL_COLUMNS}
      from app_private.point_proposals where id=:id and submitted_by=:uid""",
        id=id,
        uid=actor.user_id,
    )
    if not result:
        raise not_found()
    return wire({**result, **evidence(db, "proposal", id)})


@router.put("/point-proposals/{id}", response_model=ProposalDetail, operation_id="point_proposal_update")
def proposal_update(id: UUID, body: ProposalUpdate, db: DB, actor: User) -> Any:
    record = one(
        db,
        "select * from app_private.point_proposals where id=:id and submitted_by=:uid for update",
        id=id,
        uid=actor.user_id,
    )
    if not record:
        raise not_found()
    if record["state"] != "draft" or record["version"] != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Đề xuất đã thay đổi hoặc đã gửi duyệt. Tải lại trước khi tiếp tục.")
    validate_proposal(db, body)
    bind_evidence(db, actor, "proposal", id, body.media_ids)
    run(
        db,
        """update app_private.point_proposals set name=:name,address=:address,latitude=:lat,longitude=:lng,
      material_ids=cast(:materials as jsonb),hours=:hours,
      publish_photos=case when :set_publish_photos then :publish_photos else publish_photos end,
      version=version+1 where id=:id""",
        id=id,
        name=body.name.strip(),
        address=body.address.strip(),
        lat=body.latitude,
        lng=body.longitude,
        materials=json.dumps([str(i) for i in body.material_ids]),
        hours=body.hours.strip(),
        set_publish_photos="publish_photos" in body.model_fields_set,
        publish_photos=body.publish_photos,
    )
    return proposal_get(id, db, actor)


@router.post("/point-proposals/{id}/submit", response_model=ProposalDetail, operation_id="point_proposal_submit")
def proposal_submit(id: UUID, body: ProposalSubmit, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> Any:
        record = one(
            db,
            "select * from app_private.point_proposals where id=:id and submitted_by=:uid for update",
            id=id,
            uid=actor.user_id,
        )
        if not record:
            raise not_found()
        if record["state"] != "draft" or record["version"] != body.expected_version:
            raise APIError(409, "VERSION_CONFLICT", "Đề xuất đã thay đổi hoặc đã gửi duyệt.")
        photos = evidence(db, "proposal", id)["media_ids"]
        if not photos:
            raise APIError(422, "MEDIA_EVIDENCE_REQUIRED", "Thêm ít nhất một ảnh địa điểm trước khi gửi duyệt.")
        bind_evidence(db, actor, "proposal", id, photos)
        run(
            db,
            """update app_private.point_proposals set state='submitted',version=version+1,
          submitted_at=now(),acknowledged_at=now() where id=:id""",
            id=id,
        )
        outbox(db, id, "point.proposed", {"userId": actor.user_id})
        return proposal_get(id, db, actor)

    return idempotent(db, actor.user_id, f"point_proposal_submit:{id}", key, body.model_dump(), effect)


@router.get("/point-reports/{id}", response_model=ReportDetail, operation_id="point_report_get")
def report_get(id: UUID, db: DB, actor: User) -> Any:
    record = one(
        db,
        f"select {REPORT_COLUMNS} from app_private.point_reports where id=:id and submitted_by=:uid",
        id=id,
        uid=actor.user_id,
    )
    if not record:
        raise not_found()
    return wire({**record, **evidence(db, "report", id)})


@router.get("/me/point-reports", response_model=Page[ReportDetail], operation_id="point_reports_list")
def reports_list(db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20) -> Any:
    result = page(
        db,
        f"reports:{actor.user_id}",
        f"select {REPORT_COLUMNS} from app_private.point_reports where submitted_by=:uid",
        {"uid": actor.user_id},
        cursor=cursor,
        limit=limit,
    )
    for item in result["items"]:
        item.update(wire(evidence(db, "report", item["id"])))
    return result


@router.get(
    "/admin/collection-submissions/{kind}",
    response_model=Page[ProposalDetail | ReportDetail],
    operation_id="collection_moderation_list",
)
def moderation_list(
    kind: Literal["proposals", "reports"], db: DB, actor: User, cursor: Cursor = None, limit: Limit = 20
) -> Any:
    require_role(db, actor, "moderator")
    columns = PROPOSAL_COLUMNS if kind == "proposals" else REPORT_COLUMNS
    result = page(
        db,
        f"moderation:{kind}",
        f"select {columns} from app_private.point_{kind} where state='submitted'",
        {},
        cursor=cursor,
        limit=limit,
    )
    for item in result["items"]:
        item.update(wire(evidence(db, "proposal" if kind == "proposals" else "report", item["id"])))
    return result


def decision(
    db: Session,
    actor: Actor,
    request: Request,
    id: UUID,
    body: ReviewDecision,
    kind: Literal["proposals", "reports"],
) -> Any:
    require_role(db, actor, "moderator")
    record = one(db, f"select * from app_private.point_{kind} where id=:id for update", id=id)
    if not record:
        raise not_found()
    if record["submitted_by"] == actor.user_id:
        raise APIError(403, "SELF_REVIEW_FORBIDDEN", "Không thể xét duyệt yêu cầu của mình.")
    if record["version"] != body.expected_version or record["state"] != "submitted":
        raise APIError(409, "VERSION_CONFLICT", "Yêu cầu đã thay đổi hoặc không ở trạng thái chờ duyệt.")
    if kind == "proposals" and body.decision == "approve":
        if not evidence(db, "proposal", id)["media_ids"] or not record["acknowledged_at"]:
            raise APIError(422, "MEDIA_EVIDENCE_REQUIRED", "Cần ảnh và xác nhận cộng đồng trước khi xuất bản điểm.")
        point_id = uuid4()
        run(
            db,
            """insert into app_private.collection_points(id,code,name,address,latitude,longitude,hours,published)
          values (:id,:code,:name,:address,:lat,:lng,:hours,true)""",
            id=point_id,
            code="community-" + str(id),
            name=record["name"],
            address=record["address"],
            lat=record["latitude"],
            lng=record["longitude"],
            hours=record["hours"],
        )
        for material_id in record["material_ids"]:
            run(
                db,
                "insert into app_private.point_materials(point_id,material_id) values (:point,:material)",
                point=point_id,
                material=material_id,
            )
        run(db, "update app_private.point_proposals set published_point_id=:point where id=:id", point=point_id, id=id)
    state = "approved" if body.decision == "approve" else "rejected"
    result = one(
        db,
        f"""update app_private.point_{kind} set state=:state,reviewed_by=:uid,
      review_reason=:reason,reviewed_at=now(),version=version+1 where id=:id
      returning id,state as status,version,reviewed_at""",
        id=id,
        uid=actor.user_id,
        state=state,
        reason=body.reason,
    )
    run(
        db,
        """insert into app_private.audit_logs(actor_id,action,target_id,reason,request_id)
      values (:uid,:action,:id,:reason,:request)""",
        uid=actor.user_id,
        action=f"point_{kind}.{state}",
        id=id,
        reason=body.reason,
        request=request.state.request_id,
    )
    outbox(
        db,
        id,
        "moderation.decided",
        {
            "userId": record["submitted_by"],
            "status": state,
            "targetPath": f"/point-proposal?id={id}" if kind == "proposals" else f"/point-report?report={id}",
        },
    )
    return wire(result)


@router.post(
    "/admin/point-proposals/{id}/decision",
    response_model=ReviewResult,
    operation_id="moderation_point_proposals_decision",
)
def proposal_decision(id: UUID, body: ReviewDecision, request: Request, db: DB, actor: User) -> Any:
    return decision(db, actor, request, id, body, "proposals")


@router.post(
    "/admin/point-reports/{id}/decision",
    response_model=ReviewResult,
    operation_id="moderation_point_reports_decision",
)
def report_decision(id: UUID, body: ReviewDecision, request: Request, db: DB, actor: User) -> Any:
    return decision(db, actor, request, id, body, "reports")


def route_read(db: Session, actor: Actor, id: UUID, *, lock: bool = False) -> Any:
    result = one(
        db,
        """select id,mode,status,version,created_at,plan,material_ids,prefer_no_tolls
        from app_private.routes where id=:id and user_id=:uid"""
        + (" for update" if lock else ""),
        id=id,
        uid=actor.user_id,
    )
    if not result:
        raise not_found()
    output = dict(result)
    output["stops"] = rows(
        db,
        """select s.id,s.point_id,s.position,s.status,p.name,p.address,p.latitude,p.longitude,p.hours,
      case when p.published and not p.synthetic then p.entrance_label end as entrance_label,
      case when p.published and not p.synthetic then p.handover_instructions end as handover_instructions,
      case when p.published and not p.synthetic then p.contact_phone end as contact_phone,
      coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name)) from app_private.point_materials pm
        join app_private.waste_materials m on m.id=pm.material_id where pm.point_id=p.id),'[]') as materials
      from app_private.route_stops s join app_private.collection_points p on p.id=s.point_id
      where s.route_id=:id order by s.position""",
        id=id,
    )
    plan = output.get("plan")
    remaining = [str(s["point_id"]) for s in output["stops"] if s["status"] != "self_reported"]
    if plan and (plan.get("mode") != output["mode"] or plan.get("stopIds") != remaining):
        plan = None
    output.update(
        plan=plan,
        provider=plan["provider"] if plan else None,
        polyline=None,
        total_distance_m=plan["totalDistanceM"] if plan else None,
        total_duration_s=plan["totalDurationS"] if plan else None,
    )
    return wire(output)


def validate_stops(db: Session, ids: list[UUID]) -> None:
    if len(ids) != len(set(ids)):
        raise APIError(422, "DUPLICATE_STOP", "Điểm dừng bị trùng.")
    count = rows(
        db,
        """select id from app_private.collection_points
        where published and not synthetic and id=any(cast(:ids as uuid[]))""",
        ids=ids,
    )
    if len(count) != len(ids):
        raise not_found()


def validate_route_materials(db: Session, ids: list[UUID]) -> None:
    if len(ids) != len(set(ids)):
        raise APIError(422, "DUPLICATE_MATERIAL", "Vật liệu bị trùng.")
    found = rows(db, "select id from app_private.waste_materials where id=any(cast(:ids as uuid[]))", ids=ids)
    if len(found) != len(ids):
        raise not_found()


@router.post("/routes", status_code=201, response_model=RouteDetail, operation_id="route_create")
def route_create(body: RouteRequest, db: DB, actor: User, key: Key = None) -> Any:
    def effect() -> dict[str, Any]:
        validate_stops(db, body.stop_ids)
        validate_route_materials(db, body.material_ids)
        id = uuid4()
        run(
            db,
            """insert into app_private.routes(id,user_id,mode,material_ids)
            values (:id,:uid,:mode,cast(:materials as uuid[]))""",
            id=id,
            uid=actor.user_id,
            mode=body.mode,
            materials=body.material_ids,
        )
        for position, point_id in enumerate(body.stop_ids):
            run(
                db,
                "insert into app_private.route_stops(route_id,point_id,position) values (:id,:point,:position)",
                id=id,
                point=point_id,
                position=position,
            )
        return dict(route_read(db, actor, id))

    return idempotent(db, actor.user_id, "route_create", key, body.model_dump(), effect)


@router.get("/routes/{id}", response_model=RouteDetail, operation_id="route_get")
def route_get(id: UUID, db: DB, actor: User) -> Any:
    return route_read(db, actor, id)


@router.patch("/routes/{id}", response_model=RouteDetail, operation_id="route_update")
def route_update(id: UUID, body: RouteUpdate, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["version"] != body.expected_version or route["status"] != "draft":
        raise APIError(409, "VERSION_CONFLICT", "Hành trình đã thay đổi hoặc đã bắt đầu.")
    validate_stops(db, body.stop_ids)
    if body.material_ids is not None:
        validate_route_materials(db, body.material_ids)
    run(
        db,
        "delete from app_private.route_stops where route_id=:id and not(point_id=any(cast(:ids as uuid[])))",
        id=id,
        ids=body.stop_ids,
    )
    for position, point_id in enumerate(body.stop_ids):
        run(
            db,
            """insert into app_private.route_stops(route_id,point_id,position) values (:id,:point,:position)
          on conflict(route_id,point_id) do update set position=excluded.position""",
            id=id,
            point=point_id,
            position=position,
        )
    run(
        db,
        """update app_private.routes set mode=:mode,version=version+1,plan=null,
        material_ids=coalesce(cast(:materials as uuid[]),material_ids) where id=:id""",
        id=id,
        mode=body.mode,
        materials=body.material_ids,
    )
    return route_read(db, actor, id)


@router.post("/routes/{id}/start", response_model=RouteDetail, operation_id="route_start")
def route_start(id: UUID, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["status"] != "draft":
        raise APIError(409, "INVALID_STATE", "Chỉ bắt đầu hành trình nháp.")
    run(db, "update app_private.routes set status='active',version=version+1 where id=:id", id=id)
    return route_read(db, actor, id)


@router.put("/routes/{id}/stops/{stop_id}/replacement", response_model=RouteDetail, operation_id="route_stop_replace")
def route_replace(id: UUID, stop_id: UUID, body: StopReplacement, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["status"] != "active" or route["version"] != body.expected_version:
        raise APIError(409, "VERSION_CONFLICT", "Hành trình đã thay đổi hoặc không đang hoạt động.")
    stop = one(
        db,
        "select point_id,status,position from app_private.route_stops where route_id=:id and id=:stop",
        id=id,
        stop=stop_id,
    )
    if not stop:
        raise not_found()
    if stop["status"] != "pending":
        raise APIError(409, "STOP_ALREADY_VISITED", "Chỉ thay điểm chưa đến; lịch sử bàn giao được giữ lại.")
    validate_stops(db, [body.point_id])
    point = point_get(body.point_id, db)
    if point["capacityState"] in ("full", "closed"):
        raise APIError(409, "POINT_UNAVAILABLE", "Điểm thay thế đang đầy hoặc đóng cửa.")
    if any(str(s["pointId"]) == str(body.point_id) for s in route["stops"]):
        raise APIError(422, "DUPLICATE_STOP", "Điểm đã có trong hành trình.")
    new_stop = uuid4()
    run(db, "delete from app_private.route_stops where id=:stop and route_id=:id", stop=stop_id, id=id)
    run(
        db,
        "insert into app_private.route_stops(id,route_id,point_id,position) values (:stop,:id,:point,:position)",
        stop=new_stop,
        id=id,
        point=body.point_id,
        position=stop["position"],
    )
    run(
        db,
        """insert into app_private.route_stop_replacements
        (route_id,actor_id,old_stop_id,new_stop_id,old_point_id,new_point_id)
        values (:id,:actor,:old,:new,:old_point,:new_point)""",
        id=id,
        actor=actor.user_id,
        old=stop_id,
        new=new_stop,
        old_point=stop["point_id"],
        new_point=body.point_id,
    )
    run(db, "update app_private.routes set version=version+1,plan=null where id=:id", id=id)
    return route_read(db, actor, id)


@router.post("/routes/{id}/cancel", response_model=RouteDetail, operation_id="route_cancel")
def route_cancel(id: UUID, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["status"] not in ("draft", "active", "cancelled"):
        raise APIError(409, "INVALID_STATE", "Hành trình đã hoàn tất.")
    if route["status"] != "cancelled":
        run(
            db,
            "update app_private.routes set status='cancelled',version=version+1,plan=null where id=:id",
            id=id,
        )
    return route_read(db, actor, id)


@router.post("/routes/preview", response_model=RoutePlan, operation_id="route_preview")
def route_preview(body: RoutePreviewRequest, request: Request, db: DB, actor: User) -> Any:
    validate_stops(db, body.stop_ids)
    stops = []
    for point_id in body.stop_ids:
        point = one(
            db, "select id as point_id,latitude,longitude from app_private.collection_points where id=:id", id=point_id
        )
        assert point is not None
        stops.append(dict(point))
    return request.app.state.routing.plan(
        request.app.state.settings, body.origin, stops, body.mode, body.prefer_no_tolls
    )


@router.post("/routes/{id}/plan", response_model=RouteDetail, operation_id="route_plan_create")
def route_plan(id: UUID, body: RoutePlanRequest, request: Request, db: DB, actor: User) -> Any:
    route = route_read(db, actor, id, lock=True)
    if route["version"] != body.expected_version or route["status"] not in ("draft", "active"):
        raise APIError(
            409, "VERSION_CONFLICT", "Hành trình đã thay đổi hoặc không thể tính tuyến. Tải lại để tiếp tục."
        )
    remaining = [s for s in route["stops"] if s["status"] != "self_reported"]
    if not remaining:
        raise APIError(409, "NO_REMAINING_STOPS", "Bạn đã bàn giao ở tất cả các điểm trong hành trình.")
    validate_stops(db, [UUID(s["pointId"]) for s in remaining])
    cached = route["plan"]
    if (
        cached
        and cached["origin"] == body.origin.model_dump(by_alias=True)
        and cached["preferNoTolls"] == body.prefer_no_tolls
    ):
        age = datetime.now(UTC) - datetime.fromisoformat(cached["computedAt"])
        if timedelta(0) <= age < timedelta(minutes=5):
            return route
    stops = [
        {"id": s["id"], "point_id": s["pointId"], "latitude": s["latitude"], "longitude": s["longitude"]}
        for s in remaining
    ]
    plan = request.app.state.routing.plan(
        request.app.state.settings, body.origin, stops, route["mode"], body.prefer_no_tolls
    )
    run(
        db,
        "update app_private.routes set plan=cast(:plan as jsonb),prefer_no_tolls=:prefer_no_tolls where id=:id",
        id=id,
        plan=plan.model_dump_json(by_alias=True),
        prefer_no_tolls=body.prefer_no_tolls,
    )
    return route_read(db, actor, id)


@router.post("/assistant/conversations", operation_id="assistant_conversation_create")
def assistant_create(actor: User) -> None:
    raise APIError(503, "PROVIDER_UNAVAILABLE", "Chưa cấu hình trợ lý và nguồn tri thức đã duyệt.")
