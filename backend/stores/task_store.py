"""任务/履约存储 V2 — 批量 KOC + 全状态机"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import KocTask

TASK_FILE = os.path.join(OUTPUT_DIR, "tasks", "tasks.json")


class TaskStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(TASK_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(TASK_FILE):
            return {}
        with open(TASK_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(TASK_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, task: KocTask) -> KocTask:
        with self._lock:
            data = self._load()
            data[task.id] = task.model_dump()
            self._save(data)
        return task

    def get(self, task_id: str) -> KocTask | None:
        with self._lock:
            data = self._load()
            t = data.get(task_id)
            return KocTask(**t) if t else None

    def update(self, task_id: str, updates: dict) -> KocTask | None:
        with self._lock:
            data = self._load()
            if task_id not in data:
                return None
            data[task_id].update(updates)
            self._save(data)
            return KocTask(**data[task_id])

    # ── V2 新增：Slot 级别操作 ──

    def update_slot(self, task_id: str, slot_index: int, slot_updates: dict) -> KocTask | None:
        """更新单个 KOC slot"""
        with self._lock:
            data = self._load()
            if task_id not in data:
                return None
            slots = data[task_id].get("koc_slots", [])
            if slot_index < 0 or slot_index >= len(slots):
                return None
            slots[slot_index].update(slot_updates)
            data[task_id]["koc_slots"] = slots
            self._save(data)
            return KocTask(**data[task_id])

    def get_slot(self, task_id: str, slot_index: int) -> dict | None:
        task = self.get(task_id)
        if not task:
            return None
        slots = task.koc_slots
        if slot_index < 0 or slot_index >= len(slots):
            return None
        return slots[slot_index]

    # ── V2 新增：商家视角 ──

    def list_by_merchant(self, merchant_id: str) -> list[KocTask]:
        with self._lock:
            data = self._load()
        tasks = [KocTask(**t) for t in data.values() if t.get("merchant_id") == merchant_id]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)

    def get_merchant_tasks(self, merchant_id: str, status: str = None) -> list[KocTask]:
        """商家任务管理用"""
        tasks = self.list_by_merchant(merchant_id)
        if status:
            tasks = [t for t in tasks if t.task_status == status]
        return tasks

    # ── V2 新增：KOC 视角 ──

    def list_by_koc(self, koc_id: str) -> list[KocTask]:
        """找到所有包含该 KOC slot 的任务"""
        with self._lock:
            data = self._load()
        result = []
        for t in data.values():
            for slot in t.get("koc_slots", []):
                if slot.get("koc_id") == koc_id:
                    result.append(KocTask(**t))
                    break
        return result

    def get_koc_active_tasks(self, koc_id: str) -> list[dict]:
        """KOC 当前进行中的任务（含 slot 信息）"""
        tasks = self.list_by_koc(koc_id)
        active = []
        for t in tasks:
            for i, slot in enumerate(t.koc_slots):
                if slot.get("koc_id") == koc_id and slot.get("status") not in ("completed", "rejected", "timed_out"):
                    active.append({
                        "task": t.model_dump(),
                        "slot_index": i,
                        "slot": slot,
                    })
        return active

    # ── V2 新增：任务广场 ──

    def list_for_hall(self, koc_id: str = None, category: str = "",
                      task_type: str = "", commission_min: int = 0,
                      sort_by: str = "default") -> list[dict]:
        """KOC 视角的任务广场 — 过滤 + 排序"""
        with self._lock:
            data = self._load()

        tasks = []
        for t in data.values():
            task = KocTask(**t)

            # 只展示待匹配或进行中的任务
            if task.task_status not in ("pending", "assigned"):
                continue

            # 排除该 KOC 已在其中的任务
            already_in = False
            if koc_id:
                for slot in task.koc_slots:
                    if slot.get("koc_id") == koc_id and slot.get("status") not in ("rejected", "timed_out"):
                        already_in = True
                        break
            if already_in:
                continue

            # 加急任务已 auto-match 填满 slot → 不进入广场
            # 只展示有空闲 slot 的任务（长线任务或未填满的加急）
            assigned_count = sum(1 for s in task.koc_slots if s.get("koc_id"))
            total_slots = len(task.koc_slots)
            if total_slots > 0 and assigned_count >= total_slots:
                continue  # 所有 slot 已分配完毕，广场不展示

            # 品类筛选
            if category and category.lower() not in task.product_name.lower():
                continue

            # 佣金筛选
            if commission_min > 0 and task.commission < commission_min:
                continue

            # 任务类型筛选
            if task_type and task.task_type != task_type:
                continue

            # 计算已接单的 slot 数（只算已接受/执行中的，不算仅 assigned）
            active_statuses = {"accepted", "shipped", "received", "creating", "submitted", "completed"}
            filled = sum(1 for s in task.koc_slots if s.get("koc_id") and s.get("status") in active_statuses)
            if filled >= task.koc_required:
                continue  # 已满

            tasks.append({
                "task_id": task.id,
                "product_id": task.product_id,
                "product_name": task.product_name,
                "product_asin": task.product_asin,
                "task_type": task.task_type,
                "task_status": task.task_status,
                "commission": task.commission,
                "koc_required": task.koc_required,
                "koc_filled": filled,
                "pledge_koc": task.pledge_koc,
                "merchant_id": task.merchant_id,
                "created_at": task.created_at,
            })

        # 排序
        if sort_by == "newest":
            tasks.sort(key=lambda t: t["created_at"], reverse=True)
        elif sort_by == "commission":
            tasks.sort(key=lambda t: t["commission"], reverse=True)
        elif sort_by == "urgency":
            tasks.sort(key=lambda t: (0 if t["task_type"] == "urgent" else 1, -t["commission"]))
        else:
            # default: 发布时间 ×0.30 + 紧急度 ×0.25 + 佣金 ×0.20 + 剩余名额 ×0.25
            max_commission = max((t["commission"] for t in tasks), default=1)
            now_ts = __import__("time").time()

            def _default_score(t):
                recency = 1.0  # simplified
                urgency = 100.0 if t["task_type"] == "urgent" else 0.0
                commission_norm = t["commission"] / max_commission * 100 if max_commission > 0 else 0
                slots_remaining = 1 - (t["koc_filled"] / t["koc_required"]) if t["koc_required"] > 0 else 1
                return (recency * 0.30 + urgency * 0.25 + commission_norm * 0.20 + slots_remaining * 100 * 0.25)

            tasks.sort(key=_default_score, reverse=True)

        return tasks

    # ── V2 新增：超时检测用 ──

    def list_all(self, filters: dict = None) -> list[KocTask]:
        with self._lock:
            data = self._load()
        tasks = [KocTask(**t) for t in data.values()]
        if filters:
            for key, val in filters.items():
                tasks = [t for t in tasks if getattr(t, key, None) == val]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)

    def list_active(self) -> list[KocTask]:
        """所有进行中的任务（非 completed/disputed）"""
        with self._lock:
            data = self._load()
        return [KocTask(**t) for t in data.values()
                if t.get("task_status") not in ("completed", "disputed")]


task_store = TaskStore()
