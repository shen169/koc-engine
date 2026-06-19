"""管理后台 API"""

from fastapi import APIRouter, Depends, HTTPException
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from stores.application_store import application_store
from stores.product_store import product_store
from stores.task_store import task_store
from stores.interest_store import interest_store
from stores.referral_store import referral_store
from stores.coupon_store import coupon_store
from stores.credit_store import credit_store
from stores.user_store import user_store
from stores.report_store import report_store
from models import Report
from auth import require_admin
from services.cron import run_weekly_scan, check_ghosted_status, sync_merchant_tier, sync_koc_tier

router = APIRouter(tags=["admin"])


@router.get("/admin/stats")
def admin_stats(current_user: dict = Depends(require_admin)):
    all_kocs = koc_store.list_all()
    all_tasks = task_store.list_all()
    all_apps = application_store.list_all()
    all_products = product_store.list_all()
    all_merchants = merchant_store.list_all()
    all_interests = interest_store.list_all()
    mutual = interest_store.find_mutual()

    return {
        "kocs": {
            "total": len(all_kocs),
            "by_status": {s: len([k for k in all_kocs if k.status == s]) for s in
                          ["Applied", "Approved", "SampleSent", "Submitted", "Delivered", "Ghosted"]},
            "by_tier": {t: len([k for k in all_kocs if k.tier == t]) for t in ["L1", "L2", "L3"]},
        },
        "merchants": {"total": len(all_merchants)},
        "products": {"total": len(all_products), "active": len([p for p in all_products if p.status == "active"])},
        "tasks": {
            "total": len(all_tasks),
            "delivered": len([t for t in all_tasks if t.delivered]),
            "pending": len([t for t in all_tasks if not t.delivered]),
        },
        "applications": {
            "total": len(all_apps),
            "pending": len([a for a in all_apps if a.decision == "pending"]),
            "approved": len([a for a in all_apps if a.decision == "approved"]),
        },
        "interests": {
            "total": len(all_interests),
            "mutual_matches": len(mutual),
        },
        "coupons": {
            "total": len(coupon_store.list_all()),
        },
    }


@router.post("/admin/cron/scan")
def trigger_scan(current_user: dict = Depends(require_admin)):
    """手动触发周度扫描"""
    result = run_weekly_scan()
    return {"status": "ok", "result": result}


@router.get("/admin/cron/alerts")
def ghosted_alerts(current_user: dict = Depends(require_admin)):
    """查看逾期任务"""
    return check_ghosted_status()


@router.get("/admin/users")
def list_all_users(current_user: dict = Depends(require_admin)):
    """列出所有用户（含积分余额）"""
    users = user_store.list_all()
    result = []
    for u in users:
        balance = credit_store.get_balance(u.id)
        result.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "balance": balance,
        })
    return result


# ═══════════════════════════════════════════
# 举报管理
# ═══════════════════════════════════════════

@router.get("/admin/reports")
def list_reports(status: str = None, current_user: dict = Depends(require_admin)):
    """Admin 查看所有举报"""
    reports = report_store.list_all(status)
    return [r.model_dump() for r in reports]


@router.put("/admin/reports/{report_id}/review")
def review_report(report_id: str, data: dict, current_user: dict = Depends(require_admin)):
    """Admin 审核举报：approve（扣分）/ reject（驳回）"""
    decision = data.get("decision")
    if decision not in ("approved", "rejected"):
        raise HTTPException(400, "decision must be 'approved' or 'rejected'")

    report = report_store.get(report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status != "pending":
        raise HTTPException(400, f"Report already {report.status}")

    now = __import__("datetime").datetime.utcnow().isoformat()
    update = {
        "status": decision,
        "reviewed_by": current_user["sub"],
        "reviewed_at": now,
    }

    if decision == "approved":
        if report.reported_entity_type == "merchant":
            m = merchant_store.get(report.reported_entity_id)
            if m:
                # 扣 30 分 + 记录争议
                new_score = max(0, m.trust_score - 30)
                merchant_store.update(report.reported_entity_id, {
                    "trust_score": new_score,
                    "total_tasks_disputed": m.total_tasks_disputed + 1,
                })
                sync_merchant_tier(report.reported_entity_id)
                update["penalty"] = -30
                update["new_trust_score"] = new_score
        elif report.reported_entity_type == "koc":
            k = koc_store.get(report.reported_entity_id)
            if k:
                new_score = max(0, k.trust_score - 30)
                koc_store.update(report.reported_entity_id, {
                    "trust_score": new_score,
                })
                sync_koc_tier(report.reported_entity_id)
                update["penalty"] = -30
                update["new_trust_score"] = new_score

    report_store.update(report_id, update)
    return {"status": "ok", "decision": decision, **update}
