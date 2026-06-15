"""Cron 周期扫描 — Ghosted 检测 + Stale 标记 + 信用分更新"""

from datetime import datetime, timedelta
from config import GHOSTED_GRACE_DAYS, STALE_DAYS
from stores.koc_store import koc_store
from stores.task_store import task_store


def run_weekly_scan() -> dict:
    """执行周度扫描，返回扫描结果统计"""

    now = datetime.utcnow()
    result = {"ghosted": 0, "stale": 0, "trust_updated": 0}

    # 1. Ghosted 检测: due_at 过期 + 未交付 → 标记 Ghosted
    all_tasks = task_store.list_all()
    for task in all_tasks:
        if task.delivered or not task.due_at:
            continue
        try:
            due = datetime.fromisoformat(task.due_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        grace_deadline = due + timedelta(days=GHOSTED_GRACE_DAYS)
        if now > grace_deadline:
            task_store.update(task.id, {"delivered": False})
            koc = koc_store.get(task.koc_id)
            if koc and koc.status != "Ghosted":
                koc_store.update(task.koc_id, {
                    "status": "Ghosted",
                    "is_blacklisted": True,
                    "trust_score": max(0, koc.trust_score - 30),
                })
                result["ghosted"] += 1

    # 2. Stale 检测: 30 天无活动 → 标记状态
    all_kocs = koc_store.list_all()
    for koc in all_kocs:
        if koc.status in ("Ghosted", "Discovered"):
            continue
        try:
            last = datetime.fromisoformat(koc.last_scanned_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            last = datetime.fromisoformat(koc.discovered_at.replace("Z", "+00:00"))
        if (now - last).days > STALE_DAYS and koc.status not in ("Stale", "Ghosted"):
            koc_store.update(koc.id, {"status": "Stale" if koc.status not in ("Delivered", "Collaborating", "Upgraded") else koc.status})
            result["stale"] += 1

    # 3. 更新 last_scanned_at
    for koc in all_kocs:
        koc_store.update(koc.id, {"last_scanned_at": now.isoformat()})
        result["trust_updated"] += 1

    return result


def check_ghosted_status() -> list[dict]:
    """快速检测所有 overdue 任务，返回需关注的列表"""
    now = datetime.utcnow()
    alerts = []
    all_tasks = task_store.list_all()
    for task in all_tasks:
        if task.delivered or not task.due_at:
            continue
        try:
            due = datetime.fromisoformat(task.due_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        if now > due:
            koc = koc_store.get(task.koc_id)
            alerts.append({
                "task_id": task.id,
                "koc_id": task.koc_id,
                "koc_name": koc.display_name if koc else "Unknown",
                "due_at": task.due_at,
                "days_overdue": (now - due).days,
            })
    return alerts
