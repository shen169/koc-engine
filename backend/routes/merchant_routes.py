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
        "tier": m.tier,
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
    """KOC 举报商家的返佣链接无效 → 创建举报工单，平台审核后决定"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can report fake links")

    m = merchant_store.get(merchant_id)
    if not m:
        raise HTTPException(404, "Merchant not found")

    task_id = data.get("task_id", "")
    reason = data.get("reason", "返佣链接无效")

    from stores.report_store import report_store
    from models import Report

    # 检查是否已有 pending 举报
    existing = report_store.list_by_entity(merchant_id)
    for r in existing:
        if r.status == "pending" and r.reporter_user_id == current_user["sub"] and r.task_id == task_id:
            return {
                "status": "duplicate",
                "report_id": r.id,
                "message": "你已提交过举报，平台正在审核中",
            }

    report = Report(
        reported_entity_type="merchant",
        reported_entity_id=merchant_id,
        reporter_user_id=current_user["sub"],
        reporter_role=current_user.get("role", "koc"),
        task_id=task_id,
        reason=reason,
        status="pending",
    )
    report_store.create(report)

    return {
        "status": "pending_review",
        "report_id": report.id,
        "message": "举报已提交，平台将在 24 小时内审核处理",
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


MERCHANT_TIER_LABELS = {
    "M3": "🏆 金牌商家",
    "M2": "🥈 银牌商家",
    "M1": "🥉 铜牌商家",
}
