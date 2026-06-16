"""商家档案路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Merchant
from stores.merchant_store import merchant_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["merchants"])


@router.post("/merchants")
def create_merchant(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchants can create profiles")
    existing = merchant_store.get_by_user_id(current_user["sub"])
    if existing:
        raise HTTPException(400, "Merchant profile already exists")
    merchant = Merchant(
        user_id=current_user["sub"],
        company_name=data.get("company_name", ""),
        website=data.get("website", ""),
        amazon_storefront=data.get("amazon_storefront", ""),
        product_categories=data.get("product_categories", []),
    )
    merchant_store.create(merchant)
    return merchant.model_dump()


@router.get("/merchants/me")
def get_my_merchant(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Not a merchant")
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m:
        raise HTTPException(404, "Merchant profile not found — create one first")
    return m.model_dump()


@router.put("/merchants/me")
def update_my_merchant(updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Not a merchant")
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m:
        raise HTTPException(404, "Merchant profile not found")
    allowed = {"company_name", "website", "amazon_storefront", "product_categories"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    updated = merchant_store.update(m.id, safe)
    return updated.model_dump()


@router.get("/merchants")
def list_merchants(current_user: dict = Depends(require_admin)):
    return [m.model_dump() for m in merchant_store.list_all()]


# ── V2 新增：商家诚信度 ──

@router.get("/merchants/{merchant_id}/trust")
def get_merchant_trust(merchant_id: str, current_user: dict = Depends(get_current_user)):
    """查询商家诚信度（KOC 可查看，用于决定是否接单）"""
    m = merchant_store.get(merchant_id)
    if not m:
        raise HTTPException(404, "Merchant not found")
    return {
        "merchant_id": merchant_id,
        "trust_score": m.trust_score,
        "total_tasks_completed": m.total_tasks_completed,
        "total_tasks_disputed": m.total_tasks_disputed,
        "avg_rating": m.avg_rating,
        "level": _trust_level(m.trust_score),
    }


@router.post("/admin/merchants/{merchant_id}/trust")
def adjust_merchant_trust(merchant_id: str, data: dict, current_user: dict = Depends(require_admin)):
    """Admin 手动调整商家诚信度"""
    delta = data.get("delta", 0)
    reason = data.get("reason", "")
    if delta == 0:
        raise HTTPException(400, "delta is required")
    updated = merchant_store.update_trust_score(merchant_id, delta, reason)
    if not updated:
        raise HTTPException(404, "Merchant not found")
    return {
        "merchant_id": merchant_id,
        "new_trust_score": updated.trust_score,
        "delta": delta,
        "level": _trust_level(updated.trust_score),
    }


@router.post("/merchants/{merchant_id}/report-fake-link")
def report_fake_commission_link(merchant_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 举报商家的返佣链接无效 → 诚信度直接降到 0"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can report fake links")

    m = merchant_store.get(merchant_id)
    if not m:
        raise HTTPException(404, "Merchant not found")

    task_id = data.get("task_id", "")
    reason = data.get("reason", "")

    # 直接降到 0
    updated = merchant_store.update(merchant_id, {
        "trust_score": 0,
        "total_tasks_disputed": m.total_tasks_disputed + 1,
    })

    # 记录投诉
    from stores.user_store import user_store
    user = user_store.get_by_id(current_user["sub"])
    reporter_email = user.email if user else "unknown"

    return {
        "status": "reported",
        "merchant_id": merchant_id,
        "new_trust_score": 0,
        "level": _trust_level(0),
        "task_id": task_id,
        "reported_by": reporter_email,
        "message": "Merchant trust score set to 0. KOC投诉返佣链接无效，诚信度归零。",
    }


def _trust_level(score: int) -> str:
    if score >= 80:
        return "🛡️ 高信"
    elif score >= 60:
        return "⚠️ 一般"
    elif score >= 40:
        return "🔶 低信"
    else:
        return "🚫 危险"
