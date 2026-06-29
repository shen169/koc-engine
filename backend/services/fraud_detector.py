"""行为异常检测引擎

7 条规则 + 累计风险评分 + 自动分级处理。

规则：
  R1 - 接单→发货 过快 (< 30min)
  R2 - 发货→收货 不可能 (< 1h, 物理商品)
  R3 - 收货→提交 过快 (< 30min)
  R4 - 提交→审批 过快 (< 5min)
  R5 - 同一商家-KOC 重复 (>= 3 单)
  R6 - 商家审批率异常 (100% 通过率, >= 3 单)
  R7 - 运行时 IP 关联 (商家和 KOC 同 IP 操作)

风险等级：
  0-30  🟢 Normal     — 无动作
  31-60 🟡 Watch      — 通知 admin
  61-80 🟠 Restricted — 禁止接新任务 + 禁止提现
  81-100🔴 Frozen     — 全部操作需 admin 审核
"""

from datetime import datetime, timedelta
from typing import Optional


# ── 风险阈值 ──────────────────────────────────

RISK_THRESHOLD_WATCH = 30      # >= 30 → 通知 admin
RISK_THRESHOLD_RESTRICT = 60   # >= 60 → 限制操作
RISK_THRESHOLD_FROZEN = 80     # >= 80 → 冻结


def risk_label(score: int) -> str:
    if score >= RISK_THRESHOLD_FROZEN:
        return "frozen"
    if score >= RISK_THRESHOLD_RESTRICT:
        return "restricted"
    if score >= RISK_THRESHOLD_WATCH:
        return "watch"
    return "normal"


# ── 规则时间阈值 ──────────────────────────────

SPEED_THRESHOLDS = {
    "accept_to_ship_min": 30,       # R1: 接单→发货 最快 30 分钟
    "ship_to_receive_hours": 1,     # R2: 发货→收货 最快 1 小时（国内件一般 1-3 天）
    "receive_to_submit_min": 30,    # R3: 收货→提交内容 最快 30 分钟
    "submit_to_review_min": 5,      # R4: 提交→审批 最快 5 分钟
}


class FraudResult:
    """欺诈检测结果"""

    def __init__(
        self,
        block: bool = False,
        warn: bool = False,
        reason: str = "",
        rule: str = "",
        score: int = 0,
    ):
        self.block = block          # 是否阻止操作
        self.warn = warn            # 是否警告
        self.reason = reason        # 原因描述
        self.rule = rule            # 触发的规则编号
        self.score = score          # 风险评分

    def __repr__(self):
        return f"FraudResult(block={self.block}, warn={self.warn}, rule={self.rule}, score={self.score}, reason={self.reason[:50]})"

    @staticmethod
    def ok() -> "FraudResult":
        return FraudResult()


def _extract_ip(request) -> str:
    """从 FastAPI Request 提取客户端真实 IP"""
    try:
        # X-Forwarded-For (nginx 代理)
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        # X-Real-IP
        real_ip = request.headers.get("X-Real-IP", "")
        if real_ip:
            return real_ip.strip()
        # 直连 IP
        if hasattr(request, "client") and request.client:
            return request.client.host or ""
    except Exception:
        pass
    return ""


def _parse_iso(ts: str) -> Optional[datetime]:
    """解析 ISO 时间戳"""
    if not ts:
        return None
    try:
        # 支持带 Z、+00:00、不带时区的格式
        ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


def _minutes_between(ts1: str, ts2: str) -> Optional[float]:
    """计算两个 ISO 时间戳之间的分钟数。ts1 在前，ts2 在后。"""
    t1 = _parse_iso(ts1)
    t2 = _parse_iso(ts2)
    if not t1 or not t2:
        return None
    return (t2 - t1).total_seconds() / 60.0


# ═══════════════════════════════════════════
# FraudDetector
# ═══════════════════════════════════════════


class FraudDetector:
    """欺诈检测引擎。无状态，每次调用传入当前上下文。"""

    def __init__(self):
        pass

    # ── R1: 接单→发货 速度检查 ──────────────

    def check_accept_to_ship_speed(self, slot: dict) -> FraudResult:
        """检查从 KOC 接单到商家发货是否过快"""
        accepted_at = slot.get("accepted_at", "")
        shipped_at = slot.get("shipped_at", "")

        minutes = _minutes_between(accepted_at, shipped_at)
        if minutes is None:
            return FraudResult.ok()

        threshold = SPEED_THRESHOLDS["accept_to_ship_min"]
        if minutes < threshold:
            return FraudResult(
                block=False,
                warn=True,
                rule="R1",
                score=25,
                reason=f"Shipment occurred {minutes:.0f}min after acceptance (threshold: {threshold}min)",
            )
        return FraudResult.ok()

    # ── R2: 发货→收货 速度检查 ──────────────

    def check_ship_to_receive_speed(self, slot: dict) -> FraudResult:
        """检查从发货到收货是否快得不可能（物理商品需要物流时间）"""
        shipped_at = slot.get("shipped_at", "")
        received_at = slot.get("received_at", "")

        minutes = _minutes_between(shipped_at, received_at)
        if minutes is None:
            return FraudResult.ok()

        threshold_hours = SPEED_THRESHOLDS["ship_to_receive_hours"]
        threshold_min = threshold_hours * 60
        if minutes < threshold_min:
            return FraudResult(
                block=True,  # 物理上不可能 → 阻止
                warn=True,
                rule="R2",
                score=40,
                reason=f"Receipt confirmed {minutes:.0f}min after shipment — physically impossible for physical goods (threshold: {threshold_hours}h)",
            )
        return FraudResult.ok()

    # ── R3: 收货→提交 速度检查 ──────────────

    def check_receive_to_submit_speed(self, slot: dict) -> FraudResult:
        """检查从收货到提交内容是否过快（内容创作需要时间）"""
        received_at = slot.get("received_at", "")
        submitted_at = slot.get("submitted_at", "")

        minutes = _minutes_between(received_at, submitted_at)
        if minutes is None:
            return FraudResult.ok()

        threshold = SPEED_THRESHOLDS["receive_to_submit_min"]
        if minutes < threshold:
            return FraudResult(
                block=False,
                warn=True,
                rule="R3",
                score=20,
                reason=f"Content submitted {minutes:.0f}min after receipt (threshold: {threshold}min)",
            )
        return FraudResult.ok()

    # ── R4: 提交→审批 速度检查 ──────────────

    def check_submit_to_review_speed(self, slot: dict) -> FraudResult:
        """检查从提交到审批是否过快（无真实审核）"""
        submitted_at = slot.get("submitted_at", "")
        reviewed_at = slot.get("reviewed_at", "")

        minutes = _minutes_between(submitted_at, reviewed_at)
        if minutes is None:
            return FraudResult.ok()

        threshold = SPEED_THRESHOLDS["submit_to_review_min"]
        if minutes < threshold:
            return FraudResult(
                block=False,
                warn=True,
                rule="R4",
                score=30,
                reason=f"Review completed {minutes:.0f}min after submission — no genuine review possible (threshold: {threshold}min)",
            )
        return FraudResult.ok()

    # ── R5: 同一商家-KOC 重复合作检查 ────────

    def check_repeat_pair(
        self, merchant_id: str, koc_id: str, task_id: str = ""
    ) -> FraudResult:
        """检查同一对商家-KOC 是否重复合作过多"""
        from stores.task_store import task_store
        from stores.koc_store import koc_store

        count = 0
        active_tasks = task_store.list_active()
        completed_tasks = task_store.list_by_status("completed") if hasattr(task_store, 'list_by_status') else []

        for task in active_tasks + completed_tasks:
            if task.merchant_id != merchant_id:
                continue
            for slot in task.koc_slots:
                slot_koc_id = slot.get("koc_id", "")
                if not slot_koc_id:
                    continue
                # 通过 koc_profile_id 解析 user_id
                koc_prof = koc_store.get(slot_koc_id)
                if not koc_prof:
                    continue
                slot_koc_user_id = getattr(koc_prof, "user_id", "") or getattr(koc_prof, "email", "")
                if slot_koc_user_id == koc_id or slot.get("koc_id") == koc_id:
                    if slot.get("status") in ("completed", "approved"):
                        count += 1

        if count >= 3:
            return FraudResult(
                block=False,
                warn=True,
                rule="R5",
                score=35,
                reason=f"Same merchant-KOC pair completed {count} tasks — possible collusion",
            )
        return FraudResult.ok()

    # ── R6: 商家审批率异常检查 ────────────────

    def check_merchant_approval_pattern(self, merchant_id: str) -> FraudResult:
        """检查商家是否 100% 通过率（可能自审自过）"""
        from stores.task_store import task_store

        total_reviews = 0
        total_approvals = 0

        active_tasks = task_store.list_active()
        for task in active_tasks:
            if task.merchant_id != merchant_id:
                continue
            for slot in task.koc_slots:
                status = slot.get("status", "")
                if status in ("approved", "completed"):
                    total_approvals += 1
                    total_reviews += 1
                elif status in ("revision_requested", "timed_out"):
                    total_reviews += 1

        if total_reviews >= 3 and total_approvals == total_reviews:
            return FraudResult(
                block=False,
                warn=True,
                rule="R6",
                score=25,
                reason=f"Merchant approved {total_approvals}/{total_reviews} reviews (100%) — possible self-review",
            )
        return FraudResult.ok()

    # ── R7: 运行时 IP 关联检查 ───────────────

    def check_ip_correlation(
        self,
        task: any,
        koc_user_id: str,
        merchant_user_id: str,
        current_request_ip: str,
    ) -> FraudResult:
        """检查 KOC 和商家的操作 IP 是否相同"""
        if not current_request_ip:
            return FraudResult.ok()

        # 检查任务中之前记录的 KOC IP
        for slot in task.koc_slots:
            slot_ip = slot.get("ip_address", "")
            if slot_ip and slot_ip == current_request_ip:
                # 同 IP 出现在 KOC 和 merchant 侧
                return FraudResult(
                    block=False,
                    warn=True,
                    rule="R7",
                    score=50,
                    reason=f"Merchant and KOC share the same IP: {current_request_ip}",
                )

        return FraudResult.ok()

    # ── 综合风险评分查询 ─────────────────────

    def get_user_risk(self, user_id: str) -> dict:
        """获取用户当前风险状态"""
        from stores.fraud_store import fraud_store

        score = fraud_store.get_user_risk_score(user_id)
        label = risk_label(score)

        block = label in ("restricted", "frozen")
        return {
            "user_id": user_id,
            "risk_score": score,
            "risk_label": label,
            "block_action": block,
            "block_reason": f"Account risk level: {label} (score: {score}/100)",
        }

    def check_action_blocked(self, user_id: str, action: str = "") -> FraudResult:
        """快速检查用户是否被阻止执行某操作"""
        risk = self.get_user_risk(user_id)
        if risk["block_action"]:
            return FraudResult(
                block=True,
                warn=True,
                reason=risk["block_reason"],
                rule="CUMULATIVE",
                score=risk["risk_score"],
            )
        if risk["risk_label"] == "watch":
            return FraudResult(
                block=False,
                warn=True,
                reason=f"Account under watch (score: {risk['risk_score']}/100) during {action}",
                rule="CUMULATIVE",
                score=risk["risk_score"],
            )
        return FraudResult.ok()

    # ── 记录欺诈事件 ─────────────────────────

    def record(
        self,
        user_id: str,
        result: FraudResult,
        task_id: str = "",
        slot_index: int = -1,
        related_user_id: str = "",
        metadata: Optional[dict] = None,
    ):
        """记录欺诈事件到存储，并自动检查是否需要触发执法"""
        if result.score <= 0:
            return
        from stores.fraud_store import fraud_store

        # 记录前的风险分（用于判断是否跨阈值）
        score_before = fraud_store.get_user_risk_score(user_id)

        fraud_store.add_event(
            user_id=user_id,
            rule=result.rule,
            score=result.score,
            reason=result.reason,
            task_id=task_id,
            slot_index=slot_index,
            related_user_id=related_user_id,
            metadata=metadata,
        )

        # ── 执法 hook：检查是否跨过红线阈值 ──
        score_after = fraud_store.get_user_risk_score(user_id)
        if score_before < RISK_THRESHOLD_RESTRICT and score_after >= RISK_THRESHOLD_RESTRICT:
            self._trigger_enforcement(user_id, task_id, score_after)

    def _trigger_enforcement(self, user_id: str, task_id: str = "", score: int = 0):
        """触发红线执法。在独立 try 中运行，确保不影响主流程。"""
        try:
            role = self._get_user_role(user_id)
            if role not in ("merchant", "koc"):
                return  # admin 不执法

            from services.fraud_enforcer import fraud_enforcer

            # 判断是第 1 次还是第 2 次
            is_first = fraud_enforcer._is_first_offense(user_id)
            offense_level = 1 if is_first else 2

            print(f"[FraudDetector] Triggering enforcement for {role} {user_id} "
                  f"(score={score}, offense=#{offense_level})")

            fraud_enforcer.enforce(user_id, role, offense_level)

            # 记录执法事件
            from stores.fraud_store import fraud_store
            fraud_store.add_event(
                user_id=user_id,
                rule="ENFORCEMENT_TRIGGERED",
                score=0,
                reason=f"Auto-enforcement triggered: {role} risk_score={score}, offense=#{offense_level}",
                task_id=task_id,
                metadata={"offense_level": offense_level, "role": role, "risk_score": score},
            )
        except Exception as e:
            print(f"[FraudDetector] Enforcement error (non-fatal): {e}")

    @staticmethod
    def _get_user_role(user_id: str) -> str:
        """查询用户角色"""
        from stores.user_store import user_store
        user = user_store.get_by_id(user_id)
        return user.role if user else "unknown"

    # ── 获取用户 IP（从历史事件中聚合）───────

    def get_user_ips(self, user_id: str) -> list:
        """获取用户最近使用的 IP 列表"""
        from stores.fraud_store import fraud_store

        events = fraud_store.get_user_events(user_id, limit=100)
        ips = set()
        for e in events:
            ip = e.get("metadata", {}).get("ip", "")
            if ip:
                ips.add(ip)
        return sorted(ips)
