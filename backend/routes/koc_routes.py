"""KOC 档案路由"""

from fastapi import APIRouter, Depends, HTTPException, Query
from stores.koc_store import koc_store
from stores.user_store import user_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["koc"])


# ═══ KOC self-service profile ──────────────────────────────────────────
# MUST be defined BEFORE /koc/{koc_id} to avoid FastAPI path conflict


@router.get("/koc/me")
def get_my_koc(current_user: dict = Depends(get_current_user)):
    """KOC views their own full profile (for edit form pre-fill)."""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can view their own profile")
    koc = koc_store.get_by_email(current_user["email"])
    if not koc:
        raise HTTPException(404, "KOC profile not found — submit an application first")
    return koc.model_dump()


@router.put("/koc/me")
def update_my_koc(updates: dict, current_user: dict = Depends(get_current_user)):
    """KOC updates their own profile."""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can update their own profile")
    koc = koc_store.get_by_email(current_user["email"])
    if not koc:
        raise HTTPException(404, "KOC profile not found")
    allowed = {
        "display_name", "platform", "handle", "profile_url",
        "follower_count", "region", "niche_tags",
    }
    # Convert follower_count to int if present
    safe = {}
    for k, v in updates.items():
        if k not in allowed:
            continue
        if k == "follower_count":
            try:
                safe[k] = int(v)
            except (ValueError, TypeError):
                raise HTTPException(400, "follower_count must be an integer")
        else:
            safe[k] = v
    updated = koc_store.update(koc.id, safe)
    return updated.model_dump()


@router.get("/koc")
def list_kocs(
    status: str = Query(None),
    tier: str = Query(None),
    source_engine: str = Query(None),
    current_user: dict = Depends(require_admin),
):
    filters = {}
    if status:
        filters["status"] = status
    if tier:
        filters["tier"] = tier
    if source_engine:
        filters["source_engine"] = source_engine
    kocs = koc_store.list_all(filters if filters else None)
    return [k.model_dump() for k in kocs]


@router.get("/koc/pool")
def koc_pool(current_user: dict = Depends(get_current_user)):
    """商家视角 — 匿名 KOC 池"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchants can browse KOC pool")
    return koc_store.list_pool()


@router.get("/koc/pool/{koc_id}")
def koc_pool_detail(koc_id: str, current_user: dict = Depends(get_current_user)):
    """商家视角 — KOC 匿名详情"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchants can browse KOC pool")
    koc = koc_store.get(koc_id)
    if not koc:
        raise HTTPException(404, "KOC not found")
    return {
        "id": koc.id,
        "display_name": koc.display_name or f"Creator_{koc.id[:6]}",
        "platform": koc.platform,
        "tier": koc.tier,
        "niche_tags": koc.niche_tags,
        "score_total": koc.score_total,
        "score_reason": koc.score_reason,
        "avg_rating": koc.avg_rating,
        "completed_tasks": koc.completed_tasks,
        "region": koc.region,
        "follower_count": koc.follower_count,
        "trust_score": koc.trust_score,
    }


@router.get("/koc/{koc_id}")
def get_koc(koc_id: str, current_user: dict = Depends(get_current_user)):
    koc = koc_store.get(koc_id)
    if not koc:
        raise HTTPException(404, "KOC not found")

    role = current_user.get("role")
    if role == "admin":
        return koc.model_dump()

    if role == "koc":
        user = user_store.get_by_id(current_user["sub"])
        if user and user.email == koc.email:
            return koc.model_dump()
        raise HTTPException(403, "Not allowed to view this KOC profile")

    if role == "merchant":
        return {
            "id": koc.id,
            "display_name": koc.display_name or f"Creator_{koc.id[:6]}",
            "platform": koc.platform,
            "tier": koc.tier,
            "niche_tags": koc.niche_tags,
            "score_total": koc.score_total,
            "score_reason": koc.score_reason,
            "avg_rating": koc.avg_rating,
            "completed_tasks": koc.completed_tasks,
            "region": koc.region,
            "follower_count": koc.follower_count,
            "trust_score": koc.trust_score,
        }

    raise HTTPException(403, "Not allowed to view this KOC profile")


@router.put("/koc/{koc_id}")
def update_koc(koc_id: str, updates: dict, current_user: dict = Depends(require_admin)):
    koc = koc_store.get(koc_id)
    if not koc:
        raise HTTPException(404, "KOC not found")
    allowed = {"status", "tier", "trust_score", "is_blacklisted", "display_name", "niche_tags", "email"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    updated = koc_store.update(koc_id, safe)
    return updated.model_dump()
