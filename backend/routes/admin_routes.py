"""管理后台 API"""

from fastapi import APIRouter, Depends
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
from auth import require_admin
from services.cron import run_weekly_scan, check_ghosted_status

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
