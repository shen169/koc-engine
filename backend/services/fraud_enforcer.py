"""红线执法引擎 — 商家 & KOC 对称处罚

触发条件：用户风险分 ≥ 60（restricted）
执行时机：
  - fraud_detector.record() 记录事件后自动检查
  - Cron 每小时补扫描（幂等）
  - Admin 手动 ban

执法规则：
  第 1 次 (risk ≥ 60，无 ADMIN_CLEARED 记录):
    → 没收资产、取消任务、冻结账号、三方通知、给整改机会

  第 2 次 (risk ≥ 60，已有 ADMIN_CLEARED 记录):
    → 没收资产、取消任务、永久封禁、三方通知
"""

from datetime import datetime
from typing import Optional

from config import (
    NotifType,
    KOC_FIXED_PLEDGE,
    KOC_PLEDGE_SAMPLE,
)


class FraudEnforcer:
    """红线执法引擎。无状态，每次调用传入上下文。"""

    # ── 公共入口 ─────────────────────────────

    def enforce(self, user_id: str, role: str, offense_level: int = 1):
        """执行红线执法。根据角色分发到对应的执法函数。

        Args:
            user_id: 用户 ID（users 表）
            role: "merchant" | "koc"
            offense_level: 1 = 第 1 次（可整改），2 = 第 2 次（永久）
        """
        if role == "merchant":
            return self._enforce_merchant(user_id, offense_level)
        elif role == "koc":
            return self._enforce_koc(user_id, offense_level)
        else:
            return {"status": "skipped", "reason": f"Unknown role: {role}"}

    # ── 商家执法 ─────────────────────────────

    def _enforce_merchant(self, user_id: str, offense_level: int) -> dict:
        """对欺诈商家执行红线处罚"""
        from stores.user_store import user_store
        from stores.merchant_store import merchant_store

        user = user_store.get_by_id(user_id)
        if not user:
            return {"status": "error", "reason": "User not found"}

        # 找商家 profile（通过 user.email）
        merchant = None
        all_merchants = merchant_store.list_all()
        for m in all_merchants:
            if m.user_id == user_id:
                merchant = m
                break

        if not merchant:
            return {"status": "error", "reason": "Merchant profile not found"}

        result = {
            "status": "enforced",
            "role": "merchant",
            "user_id": user_id,
            "merchant_id": merchant.id,
            "offense_level": offense_level,
            "permanent": offense_level >= 2,
            "actions": [],
        }

        # 1. 没收佣金池 + 取消任务 + 退还 KOC 质押
        confiscated = self._confiscate_merchant_commission_pools(merchant.id, offense_level)
        result["actions"].append(confiscated)

        # 2. 取消所有活跃任务 + 退还 KOC 质押
        cancelled = self._cancel_merchant_tasks_and_refund_kocs(merchant.id)
        result["actions"].append(cancelled)

        # 3. 通知所有受影响 KOC
        notified_kocs = self._notify_affected_kocs(merchant.id, offense_level)
        result["actions"].append(notified_kocs)

        # 4. 通知商家
        self._notify_merchant(user_id, merchant, offense_level)
        result["actions"].append("notified_merchant")

        # 5. 通知 admin
        self._notify_admin(user_id, "merchant", offense_level, merchant, confiscated, cancelled)
        result["actions"].append("notified_admin")

        # 6. 冻结 / 拉黑
        if offense_level >= 2:
            self._ban_merchant(merchant.id)
            result["actions"].append("banned_permanently")
        else:
            self._freeze_merchant(merchant.id)
            result["actions"].append("frozen")

        return result

    def _confiscate_merchant_commission_pools(self, merchant_id: str, offense_level: int) -> dict:
        """没收该商家所有活跃任务的佣金池 → 平台"""
        from stores.task_store import task_store
        from stores.credit_store import credit_store

        total_confiscated = 0
        tasks_affected = 0

        merchant_tasks = task_store.list_by_merchant(merchant_id)
        active_statuses = ("pending", "assigned", "accepted", "shipped", "creating", "disputed")

        for task in merchant_tasks:
            if task.task_status not in active_statuses:
                continue
            if task.pledge_merchant > 0:
                # 把剩余佣金池转给平台（佣金池 = task.pledge_merchant，但部分可能已支付）
                # 实际没收 = 剩余未支付的佣金池
                remaining_pool = task.pledge_merchant
                for slot in task.koc_slots:
                    if slot.get("commission_paid"):
                        remaining_pool -= task.commission
                if remaining_pool > 0:
                    credit_store.add_credits(
                        "platform", remaining_pool, "fraud_confiscation_merchant",
                        task.id, f"Fraud confiscation: merchant {merchant_id} commission pool — offense #{offense_level}",
                        withdrawable=True,
                    )
                    total_confiscated += remaining_pool
                tasks_affected += 1

        return {
            "action": "confiscate_commission_pools",
            "total_confiscated_pt": total_confiscated,
            "tasks_affected": tasks_affected,
        }

    def _cancel_merchant_tasks_and_refund_kocs(self, merchant_id: str) -> dict:
        """取消该商家所有活跃任务 → 退还 KOC 质押"""
        from stores.task_store import task_store
        from stores.credit_store import credit_store
        from stores.koc_store import koc_store
        from stores.user_store import user_store

        now = datetime.utcnow().isoformat()
        tasks_cancelled = 0
        kocs_refunded = 0
        total_refunded = 0

        merchant_tasks = task_store.list_by_merchant(merchant_id)
        active_statuses = ("pending", "assigned", "accepted", "shipped", "creating", "disputed")

        for task in merchant_tasks:
            if task.task_status not in active_statuses:
                continue

            # 退还所有已接单 KOC 的质押
            for i, slot in enumerate(task.koc_slots):
                if slot.get("pledge_paid") and slot.get("status") in (
                    "accepted", "shipped", "received", "creating", "submitted",
                    "revision_requested", "assigned",
                ):
                    koc_id = slot.get("koc_id", "")
                    pledge_amount = task.pledge_koc
                    if koc_id:
                        koc_prof = koc_store.get(koc_id)
                        if koc_prof and koc_prof.email:
                            koc_usr = user_store.get_by_email(koc_prof.email)
                            if koc_usr:
                                credit_store.add_credits(
                                    koc_usr.id, pledge_amount, "pledge_return_koc",
                                    task.id, f"Pledge refunded: task cancelled due to merchant fraud — {task.product_name}",
                                    withdrawable=False,  # bonus，不可提现
                                )
                                total_refunded += pledge_amount
                                kocs_refunded += 1
                        # 标记 slot 为 timed_out（因商家欺诈）
                        task_store.update_slot(task.id, i, {
                            "status": "timed_out",
                            "pledge_paid": False,
                            "timed_out_at": now,
                            "timeout_reason": "merchant_fraud",
                        })

            # 取消任务
            task_store.update(task.id, {
                "task_status": "cancelled",
                "cancelled_at": now,
                "cancel_reason": "merchant_fraud",
            })
            tasks_cancelled += 1

        return {
            "action": "cancel_tasks_and_refund",
            "tasks_cancelled": tasks_cancelled,
            "kocs_refunded": kocs_refunded,
            "total_refunded_pt": total_refunded,
        }

    def _notify_affected_kocs(self, merchant_id: str, offense_level: int) -> dict:
        """通知所有受影响的 KOC：商家被标记，任务已取消"""
        from stores.task_store import task_store
        from stores.koc_store import koc_store
        from stores.user_store import user_store
        from services.notifier import notify_user

        notified = 0
        merchant_tasks = task_store.list_by_merchant(merchant_id)

        for task in merchant_tasks:
            for slot in task.koc_slots:
                koc_id = slot.get("koc_id", "")
                if not koc_id:
                    continue
                koc_prof = koc_store.get(koc_id)
                if not koc_prof or not koc_prof.email:
                    continue
                koc_usr = user_store.get_by_email(koc_prof.email)
                if not koc_usr:
                    continue

                level_text = "permanently banned" if offense_level >= 2 else "flagged for fraudulent activity"
                notify_user(
                    koc_usr.id,
                    NotifType.TASK_CANCELLED_FRAUD,
                    "Task Cancelled — Merchant Flagged",
                    f"Task '{task.product_name}' has been cancelled because the merchant was {level_text}. "
                    f"Your {task.pledge_koc}pt pledge has been refunded.",
                    task_id=task.id,
                    resource_path=f"/portal/tasks/{task.id}",
                )
                notified += 1

        return {"action": "notify_kocs", "kocs_notified": notified}

    def _notify_merchant(self, user_id: str, merchant, offense_level: int):
        """通知商家：被标记 / 被封禁"""
        from services.notifier import notify_user

        if offense_level >= 2:
            notify_user(
                user_id,
                NotifType.MERCHANT_BANNED,
                "Account Permanently Banned — Fraud Detected",
                f"Your merchant account '{merchant.company_name}' has been permanently banned due to repeated fraudulent activity. "
                f"All active tasks have been cancelled. This decision is final and cannot be appealed.",
                resource_path="/dashboard",
            )
        else:
            notify_user(
                user_id,
                NotifType.MERCHANT_FLAGGED,
                "Account Flagged — Fraud Warning",
                f"Your merchant account '{merchant.company_name}' has been flagged for suspicious activity. "
                f"All active tasks have been cancelled. You have ONE chance to provide evidence to admin for review. "
                f"Contact admin immediately to appeal. If flagged again after clearance, your account will be permanently banned.",
                resource_path="/dashboard",
            )

    def _freeze_merchant(self, merchant_id: str):
        """冻结商家：拉黑 + 记录标记"""
        from stores.merchant_store import merchant_store
        merchant_store.update(merchant_id, {"is_blacklisted": True})

    def _ban_merchant(self, merchant_id: str):
        """永久封禁商家"""
        from stores.merchant_store import merchant_store
        merchant_store.update(merchant_id, {
            "is_blacklisted": True,
            "trust_score": 0,
        })

    # ── KOC 执法 ─────────────────────────────

    def _enforce_koc(self, user_id: str, offense_level: int) -> dict:
        """对欺诈 KOC 执行红线处罚"""
        from stores.user_store import user_store
        from stores.koc_store import koc_store

        user = user_store.get_by_id(user_id)
        if not user:
            return {"status": "error", "reason": "User not found"}

        koc = koc_store.get_by_email(user.email)
        if not koc:
            return {"status": "error", "reason": "KOC profile not found"}

        result = {
            "status": "enforced",
            "role": "koc",
            "user_id": user_id,
            "koc_id": koc.id,
            "offense_level": offense_level,
            "permanent": offense_level >= 2,
            "actions": [],
        }

        # 1. 没收 KOC 质押 → 平台
        confiscated = self._confiscate_koc_pledges(koc.id, offense_level)
        result["actions"].append(confiscated)

        # 2. 从所有活跃 slot 移除 + 退还商家佣金池
        removed = self._remove_koc_from_slots_and_refund_merchants(koc.id)
        result["actions"].append(removed)

        # 3. 通知受影响商家
        notified_merchants = self._notify_affected_merchants(koc.id, offense_level)
        result["actions"].append(notified_merchants)

        # 4. 通知 KOC
        self._notify_koc(user_id, koc, offense_level)
        result["actions"].append("notified_koc")

        # 5. 通知 admin
        self._notify_admin(user_id, "koc", offense_level, koc, confiscated, removed)
        result["actions"].append("notified_admin")

        # 6. 冻结 / 拉黑
        if offense_level >= 2:
            self._ban_koc(koc.id)
            result["actions"].append("banned_permanently")
        else:
            self._freeze_koc(koc.id)
            result["actions"].append("frozen")

        return result

    def _confiscate_koc_pledges(self, koc_id: str, offense_level: int) -> dict:
        """没收该 KOC 所有活跃任务中的质押 → 平台"""
        from stores.task_store import task_store
        from stores.credit_store import credit_store

        total_confiscated = 0
        slots_affected = 0

        active_tasks = task_store.list_active()
        for task in active_tasks:
            for slot in task.koc_slots:
                if slot.get("koc_id") != koc_id:
                    continue
                if slot.get("pledge_paid") and slot.get("status") in (
                    "accepted", "shipped", "received", "creating", "submitted",
                    "revision_requested",
                ):
                    pledge_amount = task.pledge_koc
                    credit_store.add_credits(
                        "platform", pledge_amount, "fraud_confiscation_koc",
                        task.id, f"Fraud confiscation: KOC {koc_id} pledge — offense #{offense_level}",
                        withdrawable=True,
                    )
                    total_confiscated += pledge_amount
                    slots_affected += 1

        return {
            "action": "confiscate_koc_pledges",
            "total_confiscated_pt": total_confiscated,
            "slots_affected": slots_affected,
        }

    def _remove_koc_from_slots_and_refund_merchants(self, koc_id: str) -> dict:
        """将该 KOC 从所有活跃 slot 移除 → 退还该 slot 的佣金份额给商家"""
        from stores.task_store import task_store
        from stores.credit_store import credit_store
        from stores.merchant_store import merchant_store

        now = datetime.utcnow().isoformat()
        slots_freed = 0
        total_returned = 0

        active_tasks = task_store.list_active()
        for task in active_tasks:
            for i, slot in enumerate(task.koc_slots):
                if slot.get("koc_id") != koc_id:
                    continue
                if slot.get("status") not in (
                    "accepted", "shipped", "received", "creating", "submitted",
                    "revision_requested", "assigned",
                ):
                    continue

                # 退还该 slot 的佣金给商家佣金池（bonus，不可提现）
                if not slot.get("commission_paid") and task.commission > 0:
                    merchant = merchant_store.get(task.merchant_id)
                    if merchant:
                        credit_store.add_credits(
                            merchant.user_id, task.commission, "commission_return_fraud",
                            task.id, f"Commission returned: KOC {koc_id} removed due to fraud — {task.product_name}",
                            withdrawable=False,
                        )
                        total_returned += task.commission

                # 释放 slot
                task_store.update_slot(task.id, i, {
                    "koc_id": "",
                    "status": "assigned",
                    "accepted_at": "",
                    "shipped_at": "",
                    "received_at": "",
                    "submitted_at": "",
                    "pledge_paid": False,
                    "fraud_flags": slot.get("fraud_flags", []) + [{
                        "rule": "FRAUD_REMOVAL",
                        "score": 0,
                        "timestamp": now,
                        "reason": f"KOC removed due to fraud (offense level)"
                    }],
                })
                slots_freed += 1

        return {
            "action": "remove_koc_from_slots",
            "slots_freed": slots_freed,
            "total_commission_returned_pt": total_returned,
        }

    def _notify_affected_merchants(self, koc_id: str, offense_level: int) -> dict:
        """通知所有受影响商家：KOC 被标记，slot 已释放"""
        from stores.task_store import task_store
        from stores.merchant_store import merchant_store
        from services.notifier import notify_user

        notified = 0
        all_tasks = task_store.list_all()

        for task in all_tasks:
            for slot in task.koc_slots:
                if slot.get("koc_id") != koc_id:
                    continue
                merchant = merchant_store.get(task.merchant_id)
                if not merchant:
                    continue

                level_text = "permanently banned" if offense_level >= 2 else "flagged for fraudulent activity"
                notify_user(
                    merchant.user_id,
                    NotifType.TASK_CANCELLED_FRAUD,
                    "KOC Removed — Fraud Detected",
                    f"KOC assigned to '{task.product_name}' has been {level_text}. "
                    f"The slot has been freed and your commission ({task.commission}pt) has been returned.",
                    task_id=task.id,
                    resource_path=f"/dashboard/tasks/{task.id}",
                )
                notified += 1

        return {"action": "notify_merchants", "merchants_notified": notified}

    def _notify_koc(self, user_id: str, koc, offense_level: int):
        """通知 KOC：被标记 / 被封禁"""
        from services.notifier import notify_user

        handle = koc.handle or "KOC"
        if offense_level >= 2:
            notify_user(
                user_id,
                NotifType.KOC_BANNED,
                "Account Permanently Banned — Fraud Detected",
                f"Your KOC account '{handle}' has been permanently banned due to repeated fraudulent activity. "
                f"All pledges have been confiscated. This decision is final and cannot be appealed.",
                resource_path="/portal",
            )
        else:
            notify_user(
                user_id,
                NotifType.KOC_FLAGGED,
                "Account Flagged — Fraud Warning",
                f"Your KOC account '{handle}' has been flagged for suspicious activity. "
                f"Your active pledges have been confiscated and you have been removed from all active tasks. "
                f"You have ONE chance to provide evidence to admin for review. "
                f"Contact admin immediately to appeal. If flagged again after clearance, your account will be permanently banned.",
                resource_path="/portal",
            )

    def _freeze_koc(self, koc_id: str):
        """冻结 KOC：拉黑"""
        from stores.koc_store import koc_store
        koc_store.update(koc_id, {"is_blacklisted": True})

    def _ban_koc(self, koc_id: str):
        """永久封禁 KOC"""
        from stores.koc_store import koc_store
        koc_store.update(koc_id, {
            "is_blacklisted": True,
            "trust_score": 0,
            "status": "Banned",
        })

    # ── 公共方法 ─────────────────────────────

    def _notify_admin(self, offender_user_id: str, role: str, offense_level: int,
                      profile, confiscated: dict, cancelled: dict):
        """通知 admin：欺诈告警"""
        from stores.user_store import user_store
        from services.notifier import notify_user

        # 找 admin 用户通知
        all_users = user_store.list_all()
        admin_users = [u for u in all_users if u.role == "admin"]

        level_text = "⚠️ 1st Offense (can be cleared)" if offense_level == 1 else "🔴 2nd Offense (PERMANENT)"
        offender_name = getattr(profile, 'company_name', None) or getattr(profile, 'handle', None) or offender_user_id

        for admin in admin_users:
            notify_user(
                admin.id,
                NotifType.FRAUD_ALERT,
                f"Fraud Alert: {role.upper()} {offender_name} — {level_text}",
                f"{role.upper()} {offender_name} (user_id={offender_user_id}) triggered fraud enforcement.\n"
                f"Level: {level_text}\n"
                f"Confiscated: {confiscated.get('total_confiscated_pt', 0)}pt\n"
                f"Tasks/Slots affected: {cancelled.get('tasks_cancelled', 0) or cancelled.get('slots_freed', 0)}\n"
                f"Action: {'ban' if offense_level >= 2 else 'freeze'} — review at /admin/fraud",
                resource_path="/admin/fraud",
            )

    def _is_first_offense(self, user_id: str) -> bool:
        """检查是否为第 1 次触发（无 ADMIN_CLEARED 记录 = 第 1 次）"""
        from stores.fraud_store import fraud_store

        events = fraud_store.get_user_events(user_id, limit=200)
        for e in events:
            if e.get("rule") == "ADMIN_CLEARED":
                return False  # 被整改过 → 现在是第 2 次
        return True

    def restore_user(self, user_id: str, role: str) -> dict:
        """Admin clear — 整改通过，恢复账号"""
        from stores.user_store import user_store
        from stores.merchant_store import merchant_store
        from stores.koc_store import koc_store
        from stores.fraud_store import fraud_store
        from services.notifier import notify_user

        user = user_store.get_by_id(user_id)
        if not user:
            return {"status": "error", "reason": "User not found"}

        if role == "merchant":
            all_merchants = merchant_store.list_all()
            for m in all_merchants:
                if m.user_id == user_id:
                    merchant_store.update(m.id, {"is_blacklisted": False})
                    notify_user(
                        user_id,
                        NotifType.PLATFORM_ANNOUNCEMENT,
                        "Account Restored — Rectification Approved",
                        f"Your merchant account '{m.company_name}' has been restored after admin review. "
                        f"You can now publish tasks again. Note: any future fraud detection will result in a permanent ban.",
                        resource_path="/dashboard",
                    )
                    break

        elif role == "koc":
            koc = koc_store.get_by_email(user.email)
            if koc:
                koc_store.update(koc.id, {"is_blacklisted": False})
                notify_user(
                    user_id,
                    NotifType.PLATFORM_ANNOUNCEMENT,
                    "Account Restored — Rectification Approved",
                    f"Your KOC account '{koc.handle or 'KOC'}' has been restored after admin review. "
                    f"You can now accept tasks again. Note: any future fraud detection will result in a permanent ban.",
                    resource_path="/portal",
                )

        # 记录整改通过事件（用于区分 1st/2nd offense）
        fraud_store.add_event(
            user_id=user_id,
            rule="ADMIN_CLEARED",
            score=0,
            reason=f"Admin cleared {role} after rectification review",
            metadata={"role": role},
        )

        return {"status": "restored", "user_id": user_id, "role": role}


# 单例
fraud_enforcer = FraudEnforcer()
