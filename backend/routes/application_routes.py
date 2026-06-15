"""KOC 申请路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Application, KocProfile
from stores.application_store import application_store
from stores.koc_store import koc_store
from stores.user_store import user_store
from stores.credit_store import credit_store
from stores.referral_store import referral_store
from auth import get_current_user, require_admin
from services.scorer import score_application
from config import DEFAULT_INITIAL_CREDITS, DEFAULT_REFERRAL_REWARD_CREDITS

router = APIRouter(tags=["applications"])


@router.post("/applications")
def submit_application(data: dict):
    """KOC 提交申请 → 自动 AI 评分"""
    # 提取申请数据
    handle = data.get("handle", "")
    platform = data.get("platform", "tiktok")
    video_links = data.get("past_video_urls", [])
    niche = "general"

    # AI 评分
    scoring = score_application(handle, platform, video_links, niche)

    # 创建申请
    app = Application(
        raw_form=data,
        campaign=data.get("campaign", ""),
        referral_code=data.get("referral_code", ""),
        ai_score=scoring["total"],
        ai_reason=scoring["reason"],
        decision="pending",
    )
    application_store.create(app)

    # 创建 KOC 档案（status=Applied）
    koc = KocProfile(
        platform=platform,
        handle=handle,
        display_name=data.get("name", ""),
        follower_count=data.get("follower_count", 0),
        region=data.get("region", ""),
        email=data.get("email", ""),
        score_authenticity=scoring["authenticity"],
        score_niche=scoring["niche"],
        score_engagement=scoring["engagement"],
        score_total=scoring["total"],
        score_reason=scoring["reason"],
        tier=scoring["tier"],
        status="Applied",
    )
    koc_store.create(koc)

    # 绑定 koc_id 到申请
    application_store.update(app.id, {"koc_id": koc.id})

    # 裂变追踪
    ref_code = data.get("referral_code", "")
    if ref_code:
        ref = referral_store.get_by_code(ref_code)
        if ref and ref.status == "pending":
            referral_store.update(ref.id, {
                "referred_email": data.get("email", ""),
                "referred_koc_id": koc.id,
                "status": "joined",
            })

    return {
        "application_id": app.id,
        "koc_id": koc.id,
        "ai_score": scoring["total"],
        "ai_reason": scoring["reason"],
        "tier": scoring["tier"],
        "decision": app.decision,
    }


@router.get("/applications")
def list_applications(current_user: dict = Depends(require_admin)):
    return [a.model_dump() for a in application_store.list_all()]


@router.get("/applications/{app_id}")
def get_application(app_id: str, current_user: dict = Depends(require_admin)):
    app = application_store.get(app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return app.model_dump()


@router.put("/applications/{app_id}/decision")
def decide_application(app_id: str, data: dict, current_user: dict = Depends(require_admin)):
    decision = data.get("decision")
    if decision not in ("approved", "rejected", "watching"):
        raise HTTPException(400, "decision must be approved/rejected/watching")

    app = application_store.get(app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    application_store.update(app_id, {"decision": decision})

    if decision == "approved" and app.koc_id:
        koc_store.update(app.koc_id, {"status": "Approved"})

        # 关联用户账户（如果申请时有 email）
        email = app.raw_form.get("email", "")
        if email:
            existing_user = user_store.get_by_email(email)
            if existing_user:
                credit_store.set_initial_balance(existing_user.id, DEFAULT_INITIAL_CREDITS)

        # 裂变奖励：被推荐人审核通过 → 给推荐人奖励
        if app.referral_code:
            ref = referral_store.get_by_code(app.referral_code)
            if ref and ref.status == "joined":
                referral_store.update(ref.id, {"status": "completed"})
                credit_store.add_credits(
                    ref.referrer_koc_id,
                    DEFAULT_REFERRAL_REWARD_CREDITS,
                    "referral_reward",
                    ref.id,
                    f"Referral reward: {app.koc_id}"
                )

    elif decision == "rejected" and app.koc_id:
        koc_store.update(app.koc_id, {"status": "Ghosted"})

    return {"status": "ok", "decision": decision}
