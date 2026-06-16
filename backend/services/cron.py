"""Cron 周期扫描 V2 — 超时检测 + 自动处理 + 诚信度"""

from datetime import datetime, timedelta, timezone
from config import GHOSTED_GRACE_DAYS, STALE_DAYS
from stores.koc_store import koc_store
from stores.task_store import task_store
from stores.merchant_store import merchant_store
from stores.credit_store import credit_store
from stores.user_store import user_store
from services.matcher import rematch_slot


# ═══════════════════════════════════════════
# 超时常量
# ═══════════════════════════════════════════

SLA_ACCEPT_HOURS = 12        # KOC 接单超时
SLA_SHIP_HOURS = 48          # 商家发货超时
SLA_RECEIVE_DAYS = 7         # KOC 确认收货超时
SLA_SUBMIT_DAYS = 14         # KOC 提交内容超时


# ═══════════════════════════════════════════
# 主扫描入口
# ═══════════════════════════════════════════

def run_weekly_scan() -> dict:
    """执行周度扫描，返回扫描结果统计"""
    now = datetime.utcnow()
    result = {
        "slot_rematched": 0,
        "merchant_defaulted": 0,
        "auto_received": 0,
        "koc_defaulted": 0,
        "ghosted": 0,
        "stale": 0,
        "trust_updated": 0,
        "trust_threshold_alerts": [],
    }

    # ── V2: 超时检测（每 slot 粒度） ──
    active_tasks = task_store.list_active()
    for task in active_tasks:
        for i, slot in enumerate(task.koc_slots):
            slot_status = slot.get("status", "unknown")
            koc_id = slot.get("koc_id", "")

            # 1. 待接单超时（12h）
            if slot_status == "assigned":
                assigned_at = _parse_ts(slot.get("assigned_at", ""))
                if assigned_at and (now - assigned_at).total_seconds() > SLA_ACCEPT_HOURS * 3600:
                    _handle_accept_timeout(task, i, koc_id)
                    result["slot_rematched"] += 1

            # 2. 已接单但商家未发货（48h）
            #    只检查 task 级别的 accepted→shipped 间隔
            #    用最早的 slot accepted_at 作基准
            #    在 V2 模型中，商家对 task 发货而非每个 slot

            # 3. 已发货未确认收货（7d）
            if slot_status == "shipped":
                shipped_at = _parse_ts(slot.get("shipped_at", ""))
                if shipped_at and (now - shipped_at).days >= SLA_RECEIVE_DAYS:
                    task_store.update_slot(task.id, i, {
                        "status": "received",
                        "received_at": now.isoformat(),
                    })
                    result["auto_received"] += 1

            # 4. 已收货未提交内容（14d）
            if slot_status in ("received", "creating"):
                received_at = _parse_ts(slot.get("received_at", ""))
                if received_at and (now - received_at).days >= SLA_SUBMIT_DAYS:
                    _handle_submit_timeout(task, i, koc_id)
                    result["koc_defaulted"] += 1

        # ── 商家发货超时检测（48h from earliest accepted slot） ──
        if task.task_status == "accepted":
            earliest_accepted = _get_earliest_accepted(task.koc_slots)
            if earliest_accepted and (now - earliest_accepted).total_seconds() > SLA_SHIP_HOURS * 3600:
                _handle_merchant_ship_timeout(task)
                result["merchant_defaulted"] += 1

    # ── 诚信度阈值检测 ──
    all_merchants = merchant_store.list_all()
    for m in all_merchants:
        if m.trust_score < 40:
            result["trust_threshold_alerts"].append({
                "merchant_id": m.id,
                "company_name": m.company_name,
                "trust_score": m.trust_score,
                "level": "suspended_publish" if m.trust_score < 40 else "warning",
            })
        if m.trust_score < 20:
            result["trust_threshold_alerts"].append({
                "merchant_id": m.id,
                "company_name": m.company_name,
                "trust_score": m.trust_score,
                "level": "frozen",
            })

    # ── 保留：原有 Ghosted / Stale 检测 ──
    all_tasks = task_store.list_all()
    for task in all_tasks:
        if not task.due_at:
            continue
        # 旧版兼容：检查旧字段 delivered
        if hasattr(task, 'delivered') and task.delivered:
            continue
        try:
            due = datetime.fromisoformat(str(task.due_at).replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        grace_deadline = due + timedelta(days=GHOSTED_GRACE_DAYS)
        if now > grace_deadline:
            for slot in task.koc_slots:
                koc_id = slot.get("koc_id", "")
                if koc_id:
                    koc = koc_store.get(koc_id)
                    if koc and koc.status != "Ghosted":
                        koc_store.update(koc_id, {
                            "status": "Ghosted",
                            "trust_score": max(0, koc.trust_score - 30),
                        })
                        result["ghosted"] += 1

    # ── Stale 检测 ──
    all_kocs = koc_store.list_all()
    for koc in all_kocs:
        if koc.status in ("Ghosted", "Discovered"):
            continue
        try:
            last = datetime.fromisoformat(str(koc.last_scanned_at).replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            last = datetime.fromisoformat(str(koc.discovered_at).replace("Z", "+00:00"))
        if (now - last).days > STALE_DAYS and koc.status not in ("Stale", "Ghosted"):
            koc_store.update(koc.id, {"status": "Stale"})
            result["stale"] += 1

    for koc in all_kocs:
        koc_store.update(koc.id, {"last_scanned_at": now.isoformat()})
    result["trust_updated"] = len(all_kocs)

    return result


# ═══════════════════════════════════════════
# 快速检测（实时查询用）
# ═══════════════════════════════════════════

def check_ghosted_status() -> list[dict]:
    """快速检测所有 overdue 的 task slot，返回需关注的列表"""
    now = datetime.utcnow()
    alerts = []
    active_tasks = task_store.list_active()
    for task in active_tasks:
        for i, slot in enumerate(task.koc_slots):
            slot_status = slot.get("status", "unknown")
            koc_id = slot.get("koc_id", "")

            if slot_status == "assigned":
                assigned_at = _parse_ts(slot.get("assigned_at", ""))
                if assigned_at and (now - assigned_at).total_seconds() > SLA_ACCEPT_HOURS * 3600:
                    alerts.append({
                        "type": "accept_timeout",
                        "task_id": task.id,
                        "product_name": task.product_name,
                        "slot_index": i,
                        "koc_id": koc_id,
                        "hours_passed": round((now - assigned_at).total_seconds() / 3600, 1),
                    })

            if slot_status in ("received", "creating"):
                received_at = _parse_ts(slot.get("received_at", ""))
                if received_at and (now - received_at).days >= SLA_SUBMIT_DAYS - 2:
                    alerts.append({
                        "type": "submit_due_soon",
                        "task_id": task.id,
                        "product_name": task.product_name,
                        "slot_index": i,
                        "koc_id": koc_id,
                        "days_left": SLA_SUBMIT_DAYS - (now - received_at).days,
                    })

        # 商家发货超时即将到来
        if task.task_status == "accepted":
            earliest = _get_earliest_accepted(task.koc_slots)
            if earliest:
                hours_passed = (now - earliest).total_seconds() / 3600
                hours_left = SLA_SHIP_HOURS - hours_passed
                if 0 < hours_left < 12:
                    alerts.append({
                        "type": "ship_due_soon",
                        "task_id": task.id,
                        "product_name": task.product_name,
                        "merchant_id": task.merchant_id,
                        "hours_left": round(hours_left, 1),
                    })

    return alerts


# ═══════════════════════════════════════════
# 内部处理函数
# ═══════════════════════════════════════════

def _handle_accept_timeout(task, slot_index: int, old_koc_id: str):
    """KOC 12h 未接单 → 自动重推"""
    # 记录超时到 slot
    task_store.update_slot(task.id, slot_index, {
        "status": "timed_out",
    })

    # 尝试重新匹配
    refreshed = task_store.get(task.id)
    if refreshed:
        new_match = rematch_slot(refreshed, slot_index)
        if new_match:
            now = datetime.utcnow().isoformat()
            task_store.update_slot(task.id, slot_index, {
                "koc_id": new_match["koc_id"],
                "status": "assigned",
                "assigned_at": now,
                "reject_count": task.koc_slots[slot_index].get("reject_count", 0) + 1,
            })


def _handle_merchant_ship_timeout(task):
    """48h 未发货 → 商家违约 → 退 KOC 质押 + 扣商家点给 KOC"""
    # 退所有 accepted KOC 的质押（从商家扣）
    for i, slot in enumerate(task.koc_slots):
        if slot.get("status") == "accepted" and slot.get("pledge_paid"):
            koc_id = slot.get("koc_id", "")
            if koc_id:
                koc_uid = _get_koc_user_id(koc_id)
                credit_store.add_credits(koc_uid, task.pledge_koc or task.commission,
                                         "breach_compensation_koc", task.id,
                                         f"Merchant breach compensation: {task.product_name}")
                task_store.update_slot(task.id, i, {"pledge_paid": False})

    # 商家不退还质押（stays deducted）
    # 扣商家诚信度
    m = merchant_store.get(task.merchant_id)
    if m:
        merchant_store.update_trust_score(task.merchant_id, -20)
        merchant_store.update(task.merchant_id, {
            "total_tasks_disputed": m.total_tasks_disputed + 1,
        })

    task_store.update(task.id, {"task_status": "disputed"})


def _handle_submit_timeout(task, slot_index: int, koc_id: str):
    """14d 未提交内容 → KOC 违约 → 退商家质押 + 扣 KOC 点"""
    # 退商家质押
    if task.pledge_merchant > 0:
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, task.pledge_merchant, "breach_compensation_merchant",
                                 task.id, f"KOC breach compensation: {task.product_name}")

    # KOC 质押不退还（stays deducted）
    # 扣 KOC 信任分
    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {
                "trust_score": max(0, koc.trust_score - 20),
            })

    task_store.update_slot(task.id, slot_index, {"status": "timed_out"})
    _sync_task_disputed(task.id)


# ═══════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════

def _parse_ts(ts_str: str) -> datetime | None:
    if not ts_str:
        return None
    try:
        return datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _get_earliest_accepted(slots: list) -> datetime | None:
    """找到所有 accepted slot 里最早的 accepted_at"""
    earliest = None
    for s in slots:
        if s.get("status") == "accepted":
            at = _parse_ts(s.get("accepted_at", ""))
            if at and (earliest is None or at < earliest):
                earliest = at
    return earliest


def _get_koc_user_id(koc_profile_id: str) -> str:
    koc = koc_store.get(koc_profile_id)
    if koc and koc.email:
        user = user_store.get_by_email(koc.email)
        if user:
            return user.id
    return koc_profile_id


def _get_merchant_user_id(merchant_id: str) -> str:
    m = merchant_store.get(merchant_id)
    return m.user_id if m else merchant_id


def _sync_task_disputed(task_id: str):
    """如果大部分 slot 已超时/完成，标记任务为 disputed"""
    task = task_store.get(task_id)
    if not task:
        return
    slots = task.koc_slots
    if not slots:
        return
    active = sum(1 for s in slots if s.get("status") not in ("completed", "timed_out", "rejected"))
    if active == 0:
        task_store.update(task_id, {"task_status": "disputed"})
