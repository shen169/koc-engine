"""KOC 申请路由"""

from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from models import Application, KocProfile
from stores.application_store import application_store
from stores.koc_store import koc_store
from stores.user_store import user_store
from stores.credit_store import credit_store
from stores.referral_store import referral_store
from auth import get_current_user, require_admin
from services.scorer import score_application
from config import DEFAULT_KOC_INITIAL_CREDITS, DEFAULT_REFERRAL_REWARD_CREDITS
from services.notifier import notify_user

router = APIRouter(tags=["applications"])

# 平台 → 允许的 profile URL 域名
# 覆盖全球主流社交 / 内容平台，KOC 选择平台后 profile_url 必须匹配对应域名
PLATFORM_DOMAINS = {
    "tiktok": ["tiktok.com"],
    "douyin": ["douyin.com"],
    "instagram": ["instagram.com"],
    "youtube": ["youtube.com", "youtu.be"],
    "xiaohongshu": ["xiaohongshu.com", "xhslink.com"],
    "x": ["x.com", "twitter.com"],
    "facebook": ["facebook.com", "fb.com", "fb.watch"],
    "pinterest": ["pinterest.com", "pin.it"],
    "snapchat": ["snapchat.com"],
    "linkedin": ["linkedin.com"],
    "twitch": ["twitch.tv"],
    "threads": ["threads.net"],
    "likee": ["likee.com"],
    "kwai": ["kwai.com"],
    "triller": ["triller.co"],
    "clapper": ["clapperapp.com"],
}


@router.post("/applications")
def submit_application(data: dict):
    """KOC 提交申请 → 校验 → AI 评分"""
    # ═══ 必填字段校验 ═══
    required_fields = {
        "handle": "handle is required",
        "platform": "platform is required",
        "name": "name is required",
        "email": "email is required",
        "region": "region is required",
        "profile_url": "profile_url is required",
    }
    for field, msg in required_fields.items():
        if not data.get(field, "").strip():
            raise HTTPException(400, msg)

    # ═══ profile_url 格式校验 ═══
    profile_url = data["profile_url"].strip()
    parsed = urlparse(profile_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(400, "profile_url must be a valid HTTP/HTTPS URL")

    # ═══ 平台域名匹配 ═══
    platform = data.get("platform", "").lower()
    expected_domains = PLATFORM_DOMAINS.get(platform, [])
    if expected_domains and not any(d in parsed.netloc for d in expected_domains):
        raise HTTPException(400,
            f"profile_url domain doesn't match platform '{platform}'. "
            f"Expected one of: {', '.join(expected_domains)}")

    # ═══ niche_tags: 至少 1 个 ═══
    niche_tags = data.get("niche_tags", [])
    if not niche_tags or len(niche_tags) == 0:
        raise HTTPException(400, "At least one niche tag is required")

    # ═══ past_video_urls: 至少 2 个 ═══
    video_links = data.get("past_video_urls", [])
    if not video_links or len(video_links) < 2:
        raise HTTPException(400, "At least 2 past video/content URLs are required")

    # ═══ follower_count: 非负整数 ═══
    try:
        follower_count = int(data.get("follower_count", 0))
    except (ValueError, TypeError):
        raise HTTPException(400, "follower_count must be an integer")
    if follower_count < 0:
        raise HTTPException(400, "follower_count must be >= 0")

    # 提取申请数据
    handle = data["handle"].strip()
    niche = ", ".join(niche_tags) if niche_tags else "general"

    # AI 评分
    scoring = score_application(handle, platform, video_links, niche, profile_url, follower_count)

    # 创建申请
    app = Application(
        raw_form=data,
        campaign=data.get("campaign", ""),
        referral_code=data.get("referral_code", ""),
        ai_score=scoring["total"],
        ai_reason=scoring["reason"],
        decision="approved",
    )
    application_store.create(app)

    # 创建 KOC 档案（status=Applied）
    koc = KocProfile(
        platform=platform,
        handle=handle,
        display_name=data.get("name", ""),
        profile_url=profile_url,
        follower_count=follower_count,
        region=data.get("region", ""),
        email=data.get("email", ""),
        niche_tags=niche_tags,
        score_authenticity=scoring["authenticity"],
        score_niche=scoring["niche"],
        score_engagement=scoring["engagement"],
        score_total=scoring["total"],
        score_reason=scoring["reason"],
        tier=scoring["tier"],
        status="Approved",
    )
    koc_store.create(koc)

    # 绑定 koc_id 到申请
    application_store.update(app.id, {"koc_id": koc.id})

    # Auto-approve: grant initial credits + referral reward
    email = data.get("email", "")
    koc_email = email  # capture email for notification (define outside if-block for safety)
    if email:
        existing_user = user_store.get_by_email(email)
        if existing_user:
            credit_store.set_initial_balance(existing_user.id, DEFAULT_KOC_INITIAL_CREDITS)

        # Notification: KOC auto-approved
        koc_name = data.get("name", "User")
        notify_user(
            existing_user.id if existing_user else "",
            "auto_approved",
            "Application Approved",
            f"Your creator application has been approved. You are now a {scoring['tier']} creator.",
        )

    # Referral reward (immediate on auto-approve)
    ref_code = data.get("referral_code", "")
    if ref_code:
        ref = referral_store.get_by_code(ref_code)
        if ref and ref.status == "pending":
            referral_store.update(ref.id, {
                "referred_email": data.get("email", ""),
                "referred_koc_id": koc.id,
                "status": "completed",
            })
            credit_store.add_credits(
                ref.referrer_koc_id,
                DEFAULT_REFERRAL_REWARD_CREDITS,
                "referral_reward",
                ref.id,
                f"Referral reward: {koc.id}"
            )


    return {
        "application_id": app.id,
        "koc_id": koc.id,
        "koc_email": koc_email,
        "authenticity": scoring["authenticity"],
        "niche": scoring["niche"],
        "engagement": scoring["engagement"],
        "ai_score": scoring["total"],
        "ai_reason": scoring["reason"],
        "tier": scoring["tier"],
        "decision": "approved",
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
                credit_store.set_initial_balance(existing_user.id, DEFAULT_KOC_INITIAL_CREDITS)

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
