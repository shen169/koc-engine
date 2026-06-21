"""Cron 周期扫描 V2 — 超时检测 + 自动处理 + 诚信度 + 物流追踪"""

from datetime import datetime, timedelta, timezone
from config import GHOSTED_GRACE_DAYS, STALE_DAYS, SLA_CONTENT_REVIEW_DAYS, MAX_REVISIONS, KOC_PLATFORM_FEE
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
SLA_LONG_TERM_IDLE_DAYS = 7  # 长线任务空位无人接 → 系统介入匹配


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
        "auto_review_approved": 0,
        "koc_defaulted": 0,
        "ghosted": 0,
        "stale": 0,
        "trust_updated": 0,
        "trust_threshold_alerts": [],
        "tracking_checked": 0,
        "auto_received_from_tracking": 0,
        "tracking_exceptions": 0,
        "tracking_in_transit": 0,
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

            # 4b. 内容已提交待商家审核（3d 超时 → 自动通过）
            if slot_status == "submitted":
                submitted_at = _parse_ts(slot.get("submitted_at", ""))
                if submitted_at and (now - submitted_at).days >= SLA_CONTENT_REVIEW_DAYS:
                    _handle_auto_approve(task, i, koc_id)
                    result["auto_review_approved"] = result.get("auto_review_approved", 0) + 1

            # 4c. 商家驳回后 KOC 未重新提交（3d 超时 → 视为放弃）
            if slot_status == "revision_requested":
                reviewed_at = _parse_ts(slot.get("reviewed_at", ""))
                if reviewed_at and (now - reviewed_at).days >= SLA_CONTENT_REVIEW_DAYS:
                    _handle_revision_timeout(task, i, koc_id)
                    result["koc_defaulted"] += 1

            # 5. 长线任务空位无人接（7d）→ 系统介入自动匹配
            if (task.task_type == "long_term"
                    and not koc_id
                    and slot_status in ("assigned", "pending")):
                task_created = _parse_ts(task.created_at)
                if task_created and (now - task_created).days >= SLA_LONG_TERM_IDLE_DAYS:
                    _handle_long_term_idle(task, i)
                    result["slot_rematched"] += 1

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
        # 跳过已完成和争议中的任务（V2 用 task_status 判断）
        if task.task_status in ("completed", "disputed"):
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
                            "trust_score": max(0, koc.trust_score - 20),
                        })
                        sync_koc_tier(koc_id)
                        result["ghosted"] += 1

    # ── Stale 检测 ──
    all_kocs = koc_store.list_all()
    for koc in all_kocs:
        # 更新所有 KOC 的扫描时间（合并到同一循环）
        koc_store.update(koc.id, {"last_scanned_at": now.isoformat()})
        if koc.status in ("Ghosted", "Discovered"):
            continue
        try:
            last = datetime.fromisoformat(str(koc.last_scanned_at).replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            last = datetime.fromisoformat(str(koc.discovered_at).replace("Z", "+00:00"))
        if (now - last).days > STALE_DAYS and koc.status not in ("Stale", "Ghosted"):
            koc_store.update(koc.id, {"status": "Stale"})
            result["stale"] += 1

    result["trust_updated"] = len(all_kocs)

    # ── 物流追踪：自动查询所有 shipped slot 的物流状态 ──
    try:
        from services.tracking import run_daily_tracking_check_sync
        tracking_result = run_daily_tracking_check_sync()
        result["tracking_checked"] = tracking_result.get("total_checked", 0)
        result["auto_received_from_tracking"] = tracking_result.get("auto_received", 0)
        result["tracking_exceptions"] = tracking_result.get("exceptions", 0)
        result["tracking_in_transit"] = tracking_result.get("in_transit", 0)
    except Exception as e:
        result["tracking_error"] = str(e)[:200]

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

            # 内容已提交待商家审核，还剩不到 1 天提醒商家
            if slot_status == "submitted":
                submitted_at = _parse_ts(slot.get("submitted_at", ""))
                if submitted_at:
                    days_left = SLA_CONTENT_REVIEW_DAYS - (now - submitted_at).days
                    if 0 < days_left <= 1:
                        alerts.append({
                            "type": "review_due_soon",
                            "task_id": task.id,
                            "product_name": task.product_name,
                            "slot_index": i,
                            "koc_id": koc_id,
                            "merchant_id": task.merchant_id,
                            "days_left": days_left,
                        })

            # KOC 被驳回后未重新提交
            if slot_status == "revision_requested":
                reviewed_at = _parse_ts(slot.get("reviewed_at", ""))
                if reviewed_at:
                    days_left = SLA_CONTENT_REVIEW_DAYS - (now - reviewed_at).days
                    if 0 < days_left <= 1:
                        alerts.append({
                            "type": "revision_due_soon",
                            "task_id": task.id,
                            "product_name": task.product_name,
                            "slot_index": i,
                            "koc_id": koc_id,
                            "days_left": days_left,
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
    """KOC 12h 未接单 → 自动重推（早期不扣信任分）"""
    # 记录超时到 slot
    task_store.update_slot(task.id, slot_index, {
        "status": "timed_out",
    })

    # 尝试重新匹配（用刷新后的 task 读 reject_count）
    refreshed = task_store.get(task.id)
    if refreshed:
        new_match = rematch_slot(refreshed, slot_index)
        if new_match:
            now = datetime.utcnow().isoformat()
            prev_reject = refreshed.koc_slots[slot_index].get("reject_count", 0)
            task_store.update_slot(task.id, slot_index, {
                "koc_id": new_match["koc_id"],
                "status": "assigned",
                "assigned_at": now,
                "reject_count": prev_reject + 1,
            })


def _handle_long_term_idle(task, slot_index: int):
    """长线任务空位 7 天无人接 → 系统介入自动匹配 KOC"""
    refreshed = task_store.get(task.id)
    if refreshed:
        new_match = rematch_slot(refreshed, slot_index)
        if new_match:
            now = datetime.utcnow().isoformat()
            task_store.update_slot(task.id, slot_index, {
                "koc_id": new_match["koc_id"],
                "status": "assigned",
                "assigned_at": now,
            })


def _handle_merchant_ship_timeout(task):
    """48h 未发货 → 商家违约 → 退 KOC 质押 + 释放 slot"""
    now = datetime.utcnow().isoformat()
    # 退所有 accepted KOC 的质押并释放 slot（不再占用 KOC 的 5 个并行上限）
    for i, slot in enumerate(task.koc_slots):
        if slot.get("status") == "accepted" and slot.get("pledge_paid"):
            koc_id = slot.get("koc_id", "")
            if koc_id:
                koc_uid = _get_koc_user_id(koc_id)
                credit_store.add_credits(koc_uid, task.pledge_koc,
                                         "breach_compensation_koc", task.id,
                                         f"Merchant breach compensation: {task.product_name}")
            # 释放 slot：标记为 timed_out，解除 pled_paid
            task_store.update_slot(task.id, i, {
                "status": "timed_out",
                "pledge_paid": False,
            })

    # 商家不退还质押（stays deducted）
    # 扣商家诚信度
    m = merchant_store.get(task.merchant_id)
    if m:
        merchant_store.update_trust_score(task.merchant_id, -20)
        merchant_store.update(task.merchant_id, {
            "total_tasks_disputed": m.total_tasks_disputed + 1,
        })
        sync_merchant_tier(task.merchant_id)

    task_store.update(task.id, {"task_status": "disputed"})


def _handle_submit_timeout(task, slot_index: int, koc_id: str):
    """14d 未提交内容 → KOC 违约 → 退商家质押 + 扣 KOC 点"""
    slot = task.koc_slots[slot_index] if slot_index < len(task.koc_slots) else {}
    # 退商家质押
    merchant_return = _merchant_slot_pledge(task)
    if merchant_return > 0 and not slot.get("merchant_pledge_returned"):
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, merchant_return, "breach_compensation_merchant",
                                 task.id, f"KOC breach compensation: {task.product_name}")
        task_store.update_slot(task.id, slot_index, {"merchant_pledge_returned": True})

    # KOC 质押不退还（stays deducted）
    # 扣 KOC 信任分
    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {
                "trust_score": max(0, koc.trust_score - 15),
            })
            # 信任分联动降级
            sync_koc_tier(koc_id)

    task_store.update_slot(task.id, slot_index, {"status": "timed_out"})
    _sync_task_disputed(task.id)


def _handle_auto_approve(task, slot_index: int, koc_id: str):
    """商家 3 天内未审核 KOC 提交内容 → 自动通过 → 退双方押金 + 恢复信任"""
    now = datetime.utcnow().isoformat()
    slot = task.koc_slots[slot_index] if slot_index < len(task.koc_slots) else {}

    task_store.update_slot(task.id, slot_index, {
        "status": "approved",
        "reviewed_at": now,
        "review_feedback": "Auto-approved: merchant did not review within SLA",
        "commission_paid": True,
    })

    # 释放 KOC 质押（扣平台费）
    koc_uid = _get_koc_user_id(koc_id) if koc_id else ""
    if task.pledge_koc > 0 and slot.get("pledge_paid"):
        koc_return = task.pledge_koc - KOC_PLATFORM_FEE
        if koc_return > 0 and koc_uid:
            credit_store.add_credits(koc_uid, koc_return, "pledge_return_koc",
                                     task.id, f"Pledge returned (auto-approved): {task.product_name}")
        credit_store.add_credits("platform", KOC_PLATFORM_FEE, "koc_platform_fee",
                                 task.id, f"KOC platform fee (auto-approved): {task.product_name}")

    # 退还商家质押（全额）
    merchant_return = _merchant_slot_pledge(task)
    if merchant_return > 0 and not slot.get("merchant_pledge_returned"):
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, merchant_return, "pledge_return_merchant",
                                 task.id, f"Pledge returned (auto-approved): {task.product_name}")
        task_store.update_slot(task.id, slot_index, {"merchant_pledge_returned": True})

    # 恢复 KOC 信任分
    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            new_trust = min(100, koc.trust_score + 3)
            koc_store.update(koc_id, {
                "completed_tasks": koc.completed_tasks + 1,
                "total_collaborations": koc.total_collaborations + 1,
                "trust_score": new_trust,
            })
            sync_koc_tier(koc_id)

    # 恢复商家信任分
    m = merchant_store.get(task.merchant_id)
    if m:
        new_m_trust = min(100, m.trust_score + 3)
        merchant_store.update(task.merchant_id, {
            "total_collaborations": m.total_collaborations + 1,
            "total_tasks_completed": m.total_tasks_completed + 1,
            "trust_score": new_m_trust,
        })
        sync_merchant_tier(task.merchant_id)


def _handle_revision_timeout(task, slot_index: int, koc_id: str):
    """商家驳回后 KOC 3 天内未重新提交 → 按 KOC 违约处理"""
    slot = task.koc_slots[slot_index] if slot_index < len(task.koc_slots) else {}
    # 退商家质押
    merchant_return = _merchant_slot_pledge(task)
    if merchant_return > 0 and not slot.get("merchant_pledge_returned"):
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, merchant_return, "breach_compensation_merchant",
                                 task.id, f"KOC revision timeout: {task.product_name}")
        task_store.update_slot(task.id, slot_index, {"merchant_pledge_returned": True})

    # KOC 质押不退还
    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {
                "trust_score": max(0, koc.trust_score - 15),
            })
            sync_koc_tier(koc_id)

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


def _merchant_slot_pledge(task) -> int:
    if getattr(task, "koc_required", 0) > 0:
        return max(0, task.pledge_merchant // task.koc_required)
    return max(0, task.pledge_merchant)


# ═══════════════════════════════════════════
# 信任分 + 表现 → 等级双向联动
# ═══════════════════════════════════════════

def calculate_tier(trust_score: int, completed_tasks: int, avg_rating: float) -> str:
    """根据信任分和历史表现综合计算等级（双向：信任回升等级也回升）。

    门槛：
    - L3：信任 ≥ 75 且完成 ≥ 5 单 且均分 ≥ 4.0
    - L2：信任 ≥ 55 且完成 ≥ 2 单 且均分 ≥ 3.0
    - L1：不满足以上任一条件
    """
    if trust_score >= 75 and completed_tasks >= 5 and avg_rating >= 4.0:
        return "L3"
    elif trust_score >= 55 and completed_tasks >= 2 and avg_rating >= 3.0:
        return "L2"
    else:
        return "L1"


def sync_koc_tier(koc_id: str) -> dict | None:
    """根据 calculate_tier 同步 KOC 等级（双向：可升可降）。

    每次信任分或完成数据变化后调用，自动校准等级。
    """
    koc = koc_store.get(koc_id)
    if not koc:
        return None

    old_tier = koc.tier
    new_tier = calculate_tier(koc.trust_score, koc.completed_tasks, koc.avg_rating)

    if new_tier == old_tier:
        return None  # 无需调整

    koc_store.update(koc_id, {"tier": new_tier})

    direction = "↑" if (old_tier == "L1" and new_tier in ("L2", "L3")) or \
                       (old_tier == "L2" and new_tier == "L3") else "↓"
    reason = f"信任={koc.trust_score} 完成={koc.completed_tasks} 均分={koc.avg_rating:.1f}"
    print(f"[tier] {koc.display_name or koc_id[:8]}: {old_tier} {direction} {new_tier} ({reason})")

    return {
        "koc_id": koc_id,
        "old_tier": old_tier,
        "new_tier": new_tier,
        "trust_score": koc.trust_score,
        "direction": "up" if direction == "↑" else "down",
        "reason": reason,
    }


# ═══════════════════════════════════════════
# 商家诚信等级（对标 KOC）
# ═══════════════════════════════════════════

def calculate_merchant_tier(trust_score: int, completed_tasks: int, avg_rating: float) -> str:
    """根据商家信任分和历史表现综合计算等级（双向）。

    门槛：
    - M3：信任 ≥ 75 且完成 ≥ 10 单 且均分 ≥ 4.0
    - M2：信任 ≥ 55 且完成 ≥ 3 单 且均分 ≥ 3.0
    - M1：不满足以上任一条件
    """
    if trust_score >= 75 and completed_tasks >= 10 and avg_rating >= 4.0:
        return "M3"
    elif trust_score >= 55 and completed_tasks >= 3 and avg_rating >= 3.0:
        return "M2"
    else:
        return "M1"


def sync_merchant_tier(merchant_id: str) -> dict | None:
    """根据 calculate_merchant_tier 同步商家等级（双向：可升可降）。

    每次信任分或完成数据变化后调用，自动校准等级。
    """
    m = merchant_store.get(merchant_id)
    if not m:
        return None

    old_tier = m.tier
    new_tier = calculate_merchant_tier(m.trust_score, m.total_tasks_completed, m.avg_rating)

    if new_tier == old_tier:
        return None  # 无需调整

    merchant_store.update(merchant_id, {"tier": new_tier})

    direction = "↑" if (old_tier == "M1" and new_tier in ("M2", "M3")) or \
                       (old_tier == "M2" and new_tier == "M3") else "↓"
    reason = f"信任={m.trust_score} 完成={m.total_tasks_completed} 均分={m.avg_rating:.1f}"
    print(f"[tier:merchant] {m.company_name or merchant_id[:8]}: {old_tier} {direction} {new_tier} ({reason})")

    return {
        "merchant_id": merchant_id,
        "old_tier": old_tier,
        "new_tier": new_tier,
        "trust_score": m.trust_score,
        "direction": "up" if direction == "↑" else "down",
        "reason": reason,
    }


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
