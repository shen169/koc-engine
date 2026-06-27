"""Cron 周期扫描 V2 — 超时检测 + 自动处理 + 诚信度 + 物流追踪 + 通知"""

from datetime import datetime, timedelta, timezone
from config import GHOSTED_GRACE_DAYS, STALE_DAYS, SLA_CONTENT_REVIEW_DAYS, SLA_REVISION_DAYS, MAX_REVISIONS, KOC_PLATFORM_FEE_RATE, KOC_PLATFORM_FEE_MIN, KOC_FIXED_PLEDGE, NotifType
from stores.koc_store import koc_store
from stores.task_store import task_store
from stores.merchant_store import merchant_store
from stores.credit_store import credit_store
from stores.user_store import user_store
from services.matcher import rematch_slot
from services.notifier import notify_user


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
                if shipped_at:
                    days_since_ship = (now - shipped_at).days
                    # ⚠️ 预警：已发货 5 天，2 天后系统自动确认收货
                    if days_since_ship >= 5:
                        koc_uid_w = _get_koc_user_id(koc_id) if koc_id else ""
                        _warn_if_needed(task, i, "receive_5d", days_since_ship < SLA_RECEIVE_DAYS,
                            NotifType.DEADLINE_WARNING,
                            "⏰ 2 Days Left — Confirm Receipt",
                            f"{task.product_name}: You have 2 days left to confirm receipt before the system auto-confirms.",
                            koc_uid_w, f"/portal/tasks/{task.id}",
                            koc_name="Creator", days_left=2)

                if shipped_at and (now - shipped_at).days >= SLA_RECEIVE_DAYS:
                    task_store.update_slot(task.id, i, {
                        "status": "received",
                        "received_at": now.isoformat(),
                    })
                    result["auto_received"] += 1

                    # ── 通知 KOC：系统自动确认收货 ──
                    if koc_id:
                        koc_uid = _get_koc_user_id(koc_id)
                        if koc_uid:
                            notify_user(
                                koc_uid,
                                NotifType.RECEIPT_AUTO,
                                "Receipt Auto-Confirmed",
                                f"System auto-confirmed receipt of {task.product_name}. You have 14 days to submit content.",
                                task_id=task.id,
                                resource_path=f"/portal/tasks/{task.id}",
                            )

                    # ── 通知商家：系统自动确认收货 ──
                    m_uid = _get_merchant_user_id(task.merchant_id)
                    if m_uid:
                        notify_user(
                            m_uid,
                            NotifType.RECEIPT_AUTO,
                            "Receipt Auto-Confirmed by System",
                            f"A KOC's receipt of {task.product_name} has been auto-confirmed. Content creation in progress.",
                            task_id=task.id,
                            resource_path=f"/dashboard/tasks/{task.id}",
                        )

            # 4. 已收货未提交内容（14d）
            if slot_status in ("received", "creating"):
                received_at = _parse_ts(slot.get("received_at", ""))
                if received_at:
                    days_since_received = (now - received_at).days
                    koc_uid_w = _get_koc_user_id(koc_id) if koc_id else ""
                    koc_prof_w = koc_store.get(koc_id) if koc_id else None
                    koc_name_w = koc_prof_w.handle if (koc_prof_w and koc_prof_w.handle) else "Creator"

                    # ⚠️ 预警：已收货 7 天，还剩 7 天提交内容
                    if days_since_received >= 7:
                        _warn_if_needed(task, i, "submit_7d", days_since_received < SLA_SUBMIT_DAYS,
                            NotifType.DEADLINE_WARNING,
                            "⏰ 7 Days Left — Submit Your Content",
                            f"{task.product_name}: You have 7 days left to submit content. Late submission = 10pt forfeited + Trust Score -15.",
                            koc_uid_w, f"/portal/tasks/{task.id}",
                            koc_name=koc_name_w, days_left=SLA_SUBMIT_DAYS - days_since_received)

                    # ⚠️ 预警：已收货 11 天，仅剩 3 天！
                    if days_since_received >= 11:
                        _warn_if_needed(task, i, "submit_11d", days_since_received < SLA_SUBMIT_DAYS,
                            NotifType.DEADLINE_WARNING,
                            "🚨 3 Days Left — Submit Now or Lose Pledge!",
                            f"{task.product_name}: ONLY 3 DAYS LEFT! Submit your content now or your 10pt pledge will be forfeited + Trust Score -15.",
                            koc_uid_w, f"/portal/tasks/{task.id}",
                            koc_name=koc_name_w, days_left=SLA_SUBMIT_DAYS - days_since_received)

                if received_at and (now - received_at).days >= SLA_SUBMIT_DAYS:
                    _handle_submit_timeout(task, i, koc_id)
                    result["koc_defaulted"] += 1

            # 4b. 内容已提交待商家审核（3d 超时 → 自动通过）
            if slot_status == "submitted":
                submitted_at = _parse_ts(slot.get("submitted_at", ""))
                if submitted_at:
                    days_since_submit = (now - submitted_at).days
                    m_uid_w = _get_merchant_user_id(task.merchant_id)

                    # ⚠️ 预警：已提交 2 天，商家 1 天后自动通过
                    if days_since_submit >= 2:
                        _warn_if_needed(task, i, "review_2d", days_since_submit < SLA_CONTENT_REVIEW_DAYS,
                            NotifType.DEADLINE_WARNING,
                            "⏰ 1 Day Left — Review Content",
                            f"{task.product_name}: You have 1 day left to review KOC content before auto-approval. Commission will be released automatically.",
                            m_uid_w, f"/dashboard/tasks/{task.id}",
                            koc_name="Brand", days_left=SLA_CONTENT_REVIEW_DAYS - days_since_submit)

                if submitted_at and (now - submitted_at).days >= SLA_CONTENT_REVIEW_DAYS:
                    _handle_auto_approve(task, i, koc_id)
                    result["auto_review_approved"] = result.get("auto_review_approved", 0) + 1

            # 4c. 商家驳回后 KOC 未重新提交（超时 → 视为放弃）
            if slot_status == "revision_requested":
                reviewed_at = _parse_ts(slot.get("reviewed_at", ""))
                if reviewed_at:
                    days_since_review = (now - reviewed_at).days
                    koc_uid_w = _get_koc_user_id(koc_id) if koc_id else ""
                    koc_prof_w = koc_store.get(koc_id) if koc_id else None
                    koc_name_w = koc_prof_w.handle if (koc_prof_w and koc_prof_w.handle) else "Creator"

                    # ⚠️ 预警：驳回 1 天后，还剩 2 天修改重交
                    if days_since_review >= 1:
                        _warn_if_needed(task, i, "revision_1d", days_since_review < SLA_REVISION_DAYS,
                            NotifType.DEADLINE_WARNING,
                            "⏰ Revision Due — Resubmit Within {n} Days",
                            f"{task.product_name}: You have {SLA_REVISION_DAYS - days_since_review} day(s) left to revise and resubmit. Timeout = 10pt forfeited + Trust Score -15.",
                            koc_uid_w, f"/portal/tasks/{task.id}",
                            koc_name=koc_name_w, days_left=SLA_REVISION_DAYS - days_since_review)

                if reviewed_at and (now - reviewed_at).days >= SLA_REVISION_DAYS:
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
            if earliest_accepted:
                hours_since = (now - earliest_accepted).total_seconds() / 3600
                m_uid_w = _get_merchant_user_id(task.merchant_id)

                # ⚠️ 预警：接单 36h 后，商家仅剩 12h 发货
                if hours_since >= 36 and hours_since < SLA_SHIP_HOURS:
                    _warn_if_needed(task, 0, "ship_36h", True,
                        NotifType.DEADLINE_WARNING,
                        "🚨 12 Hours Left — Ship or Face Penalty!",
                        f"{task.product_name}: Only 12 hours left to ship! Timeout = Trust Score -20 + commission pool forfeited + task disputed.",
                        m_uid_w, f"/dashboard/tasks/{task.id}",
                        koc_name="Brand", days_left=0)

                if hours_since > SLA_SHIP_HOURS:
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

            # KOC 被驳回后未重新提交（修改期 = SLA_REVISION_DAYS）
            if slot_status == "revision_requested":
                reviewed_at = _parse_ts(slot.get("reviewed_at", ""))
                if reviewed_at:
                    days_left = SLA_REVISION_DAYS - (now - reviewed_at).days
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

            # ── 通知商家：空位已被系统自动匹配 ──
            m_uid = _get_merchant_user_id(task.merchant_id)
            if m_uid:
                notify_user(
                    m_uid,
                    NotifType.TASK_REMATCHED,
                    "Long-Term Slot Auto-Matched",
                    f"{task.product_name}: An empty slot was auto-matched by the system after 7 days unclaimed.",
                    task_id=task.id,
                    resource_path=f"/dashboard/tasks/{task.id}",
                )

            # ── 通知 KOC：被系统匹配到长线任务 ──
            koc_uid = _get_koc_user_id(new_match["koc_id"])
            if koc_uid:
                notify_user(
                    koc_uid,
                    NotifType.KOC_MATCHED,
                    "New Task Assignment — Long-Term Match",
                    f"You have been auto-matched to {task.product_name}. The brand will ship within 48h. 10pt pledge required upon acceptance.",
                    task_id=task.id,
                    resource_path=f"/portal/tasks/{task.id}",
                )


def _handle_merchant_ship_timeout(task):
    """48h 未发货 → 商家违约 → 退 KOC 质押全额 10pt + 释放 slot"""
    now = datetime.utcnow().isoformat()
    # 退所有 accepted KOC 的质押并释放 slot
    for i, slot in enumerate(task.koc_slots):
        if slot.get("status") == "accepted" and slot.get("pledge_paid"):
            koc_id = slot.get("koc_id", "")
            if koc_id:
                koc_uid = _get_koc_user_id(koc_id)
                credit_store.add_credits(koc_uid, KOC_FIXED_PLEDGE,
                                         "breach_compensation_koc", task.id,
                                         f"Merchant breach compensation: {task.product_name}",
                                         withdrawable=False)
                # ── 通知 KOC：商家违约，质押全额退回 ──
                notify_user(
                    koc_uid,
                    NotifType.VIOLATION,
                    "Brand Failed to Ship — Pledge Refunded",
                    f"{task.product_name}: Brand did not ship within 48 hours. Your 10pt pledge has been refunded in full. Trust Score -20 applied to brand.",
                    task_id=task.id,
                    resource_path=f"/portal/tasks/{task.id}",
                )
            task_store.update_slot(task.id, i, {
                "status": "timed_out",
                "pledge_paid": False,
            })

    # 商家不退还佣金池（stays deducted — 违约惩罚）

    # 扣商家诚信度
    m = merchant_store.get(task.merchant_id)
    if m:
        merchant_store.update_trust_score(task.merchant_id, -20)
        merchant_store.update(task.merchant_id, {
            "total_tasks_disputed": m.total_tasks_disputed + 1,
        })
        sync_merchant_tier(task.merchant_id)

        # ── 通知商家：违约 ──
        if m.user_id:
            notify_user(
                m.user_id,
                NotifType.VIOLATION,
                "Shipping Deadline Missed — Task Disputed",
                f"You did not ship {task.product_name} within 48 hours. Your Trust Score -20 and the task has been disputed. Commission pool is forfeited.",
                task_id=task.id,
                resource_path=f"/dashboard/tasks/{task.id}",
            )

    task_store.update(task.id, {"task_status": "disputed"})


def _handle_submit_timeout(task, slot_index: int, koc_id: str):
    """14d 未提交内容 → KOC 违约 → 退 commission 给商家 + KOC 质押 10pt 不退"""
    # 退还 commission 给商家（KOC 没完成不该收钱）→ bonus，不可提现
    if task.commission > 0:
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, task.commission, "commission_returned",
                                 task.id, f"Commission returned (KOC submit timeout): {task.product_name}",
                                 withdrawable=False)

    # KOC 质押 10pt 不退 → 全部给平台
    credit_store.add_credits("platform", KOC_FIXED_PLEDGE, "forfeited_pledge",
                             task.id, f"KOC forfeited pledge (submit timeout): {task.product_name}")

    # 扣 KOC 信任分
    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {
                "trust_score": max(0, koc.trust_score - 15),
            })
            sync_koc_tier(koc_id)

    task_store.update_slot(task.id, slot_index, {"status": "timed_out", "pledge_paid": False})
    _sync_task_disputed(task.id)

    # ── 通知 KOC：违约 ──
    if koc_id:
        koc_uid = _get_koc_user_id(koc_id)
        if koc_uid:
            notify_user(
                koc_uid,
                NotifType.VIOLATION,
                "Content Submission Timeout — Pledge Forfeited",
                f"{task.product_name}: You missed the 14-day content submission deadline. Your 10pt pledge has been forfeited and Trust Score -15.",
                task_id=task.id,
                resource_path=f"/portal/tasks/{task.id}",
                template_name="violation",
                template_vars={
                    "koc_name": "Creator",
                    "reason": "Missed 14-day content submission deadline",
                    "penalty": "10pt pledge forfeited, Trust Score -15",
                },
            )

    # ── 通知商家：KOC 违约，commission 退回 ──
    m_uid = _get_merchant_user_id(task.merchant_id)
    if m_uid and task.commission > 0:
        notify_user(
            m_uid,
            NotifType.VIOLATION,
            "KOC Missed Submission Deadline — Commission Refunded",
            f"{task.product_name}: A KOC missed the content submission deadline. {task.commission}pt commission has been refunded to your account.",
            task_id=task.id,
            resource_path=f"/dashboard/tasks/{task.id}",
        )


def _handle_auto_approve(task, slot_index: int, koc_id: str):
    """商家超时未审核 KOC 提交内容 → 自动通过 → 佣金给 KOC + 退质押"""
    now = datetime.utcnow().isoformat()
    slot = task.koc_slots[slot_index] if slot_index < len(task.koc_slots) else {}

    task_store.update_slot(task.id, slot_index, {
        "status": "approved",
        "reviewed_at": now,
        "review_feedback": "Auto-approved: merchant did not review within SLA",
        "commission_paid": True,
    })

    # 平台抽成 = max(1pt, int(commission × 10%))
    platform_fee = max(KOC_PLATFORM_FEE_MIN, int(task.commission * KOC_PLATFORM_FEE_RATE))
    koc_commission = task.commission - platform_fee

    koc_uid = _get_koc_user_id(koc_id) if koc_id else ""
    if slot.get("pledge_paid"):
        # 质押全额退还 → bonus（不可提现）
        if koc_uid:
            credit_store.add_credits(koc_uid, KOC_FIXED_PLEDGE, "pledge_return_koc",
                                     task.id, f"Pledge returned (auto-approved): {task.product_name}",
                                     withdrawable=False)
        # 佣金 90% → withdrawable
        if koc_commission > 0 and koc_uid:
            credit_store.add_credits(koc_uid, koc_commission, "commission_earned",
                                     task.id, f"Commission earned (auto-approved, {task.commission}pt − {platform_fee}pt fee): {task.product_name}",
                                     withdrawable=True)
        # 平台抽成
        credit_store.add_credits("platform", platform_fee, "koc_platform_fee",
                                 task.id, f"KOC platform fee (auto-approved): {task.product_name}")

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

    # 商家逾期未审核 → 不奖励信任分（错过 SLA 是负面行为）
    # 仅标记完成统计；trust_score 不变
    m = merchant_store.get(task.merchant_id)
    if m:
        merchant_store.update(task.merchant_id, {
            "total_collaborations": m.total_collaborations + 1,
            "total_tasks_completed": m.total_tasks_completed + 1,
        })
        sync_merchant_tier(task.merchant_id)

    # ── 通知 KOC：自动通过，佣金到账 ──
    total_earned = koc_commission + KOC_FIXED_PLEDGE
    if koc_uid:
        notify_user(
            koc_uid,
            NotifType.AUTO_APPROVED,
            "Content Auto-Approved — Earnings Credited",
            f"{task.product_name}: Brand did not review within 3 days — content auto-approved. +{koc_commission}pt withdrawable + {KOC_FIXED_PLEDGE}pt pledge returned.",
            task_id=task.id,
            resource_path=f"/portal/tasks/{task.id}",
        )

    # ── 通知商家：超时自动通过 ──
    if m and m.user_id:
        notify_user(
            m.user_id,
            NotifType.AUTO_APPROVED,
            "Content Auto-Approved — Review Deadline Missed",
            f"{task.product_name}: You missed the 3-day review window. Content has been auto-approved and commission released to KOC.",
            task_id=task.id,
            resource_path=f"/dashboard/tasks/{task.id}",
        )


def _handle_revision_timeout(task, slot_index: int, koc_id: str):
    """商家驳回后 KOC 超时未重新提交 → 按 KOC 违约处理"""
    # 退还 commission 给商家 → bonus，不可提现
    if task.commission > 0:
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, task.commission, "commission_returned",
                                 task.id, f"Commission returned (KOC revision timeout): {task.product_name}",
                                 withdrawable=False)

    # KOC 质押 10pt 不退 → 全部给平台
    credit_store.add_credits("platform", KOC_FIXED_PLEDGE, "forfeited_pledge",
                             task.id, f"KOC forfeited pledge (revision timeout): {task.product_name}")

    if koc_id:
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {
                "trust_score": max(0, koc.trust_score - 15),
            })
            sync_koc_tier(koc_id)

    task_store.update_slot(task.id, slot_index, {"status": "timed_out", "pledge_paid": False})
    _sync_task_disputed(task.id)

    # ── 通知 KOC：修改超时，质押没收 ──
    if koc_id:
        koc_uid = _get_koc_user_id(koc_id)
        if koc_uid:
            notify_user(
                koc_uid,
                NotifType.VIOLATION,
                "Revision Timeout — Pledge Forfeited",
                f"{task.product_name}: You missed the 3-day revision deadline. Your 10pt pledge has been forfeited and Trust Score -15.",
                task_id=task.id,
                resource_path=f"/portal/tasks/{task.id}",
                template_name="violation",
                template_vars={
                    "koc_name": "Creator",
                    "reason": "Missed 3-day revision resubmission deadline",
                    "penalty": "10pt pledge forfeited, Trust Score -15",
                },
            )

    # ── 通知商家：KOC 修改超时，commission 退回 ──
    m_uid = _get_merchant_user_id(task.merchant_id)
    if m_uid and task.commission > 0:
        notify_user(
            m_uid,
            NotifType.VIOLATION,
            "KOC Missed Revision Deadline — Commission Refunded",
            f"{task.product_name}: KOC did not resubmit within 3 days. {task.commission}pt commission has been refunded to your account.",
            task_id=task.id,
            resource_path=f"/dashboard/tasks/{task.id}",
        )


# ═══════════════════════════════════════════
# 主动倒计时预警（超时前推送提醒，避免用户被动踩雷）
# ═══════════════════════════════════════════

def _warn_if_needed(task, slot_index: int, stage: str, should_warn: bool,
                    ntype: str, title: str, message: str,
                    user_id: str, resource_path: str = "", **template_vars):
    """通用预警：仅在 slot 尚未对该 stage 发过警告时发送，并记录 warned_stages 防重。"""
    slot = task.koc_slots[slot_index] if slot_index < len(task.koc_slots) else {}
    warned_stages = list(slot.get("warned_stages", []))
    if stage in warned_stages or not should_warn:
        return
    if not user_id:
        return

    notify_user(
        user_id, ntype, title, message,
        task_id=task.id, resource_path=resource_path,
        template_name="warning",
        template_vars={
            "koc_name": template_vars.get("koc_name", "Creator"),
            "product_name": task.product_name,
            "days_left": template_vars.get("days_left", 1),
        },
    )
    warned_stages.append(stage)
    task_store.update_slot(task.id, slot_index, {"warned_stages": warned_stages})


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

    # ── 通知 KOC：等级变更 ──
    if koc.email:
        koc_usr = user_store.get_by_email(koc.email)
        if koc_usr:
            tier_names = {"L1": "Explorer", "L2": "Creator", "L3": "Partner"}
            notify_user(
                koc_usr.id,
                NotifType.TIER_CHANGED,
                f"Tier {'Upgraded' if direction == '↑' else 'Downgraded'} — {tier_names.get(new_tier, new_tier)}",
                f"Your tier has changed: {old_tier}→{new_tier}. Trust Score: {koc.trust_score}, Completed: {koc.completed_tasks}, Avg Rating: {koc.avg_rating:.1f}",
                resource_path="/portal",
            )

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

    # ── 通知商家：等级变更 ──
    if m.user_id:
        tier_names = {"M1": "Bronze Merchant", "M2": "Silver Merchant", "M3": "Gold Merchant"}
        notify_user(
            m.user_id,
            NotifType.TIER_CHANGED,
            f"Tier {'Upgraded' if direction == '↑' else 'Downgraded'} — {tier_names.get(new_tier, new_tier)}",
            f"Your merchant tier has changed: {old_tier}→{new_tier}. Trust Score: {m.trust_score}, Completed: {m.total_tasks_completed}, Avg Rating: {m.avg_rating:.1f}",
            resource_path="/dashboard",
        )

    return {
        "merchant_id": merchant_id,
        "old_tier": old_tier,
        "new_tier": new_tier,
        "trust_score": m.trust_score,
        "direction": "up" if direction == "↑" else "down",
        "reason": reason,
    }


def _sync_task_disputed(task_id: str):
    """如果大部分 slot 已超时/完成，标记任务为 disputed。
    ⚠️ KEEP IN SYNC with task_routes._sync_task_disputed (same function duplicated to avoid circular import)."""
    task = task_store.get(task_id)
    if not task:
        return
    slots = task.koc_slots
    if not slots:
        return
    active = sum(1 for s in slots if s.get("status") not in ("completed", "approved", "timed_out", "rejected"))
    if active == 0:
        task_store.update(task_id, {"task_status": "disputed"})
