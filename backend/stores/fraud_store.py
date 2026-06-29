"""欺诈事件持久化存储

记录所有 fraud detection 事件，支持：
- 按用户聚合风险评分
- 按任务/商家/KOC 查询历史
- Admin 面板展示
"""

import json
import os
import threading
from datetime import datetime
from typing import Optional
from config import OUTPUT_DIR

FRAUD_FILE = os.path.join(OUTPUT_DIR, "fraud", "fraud_events.json")


class FraudStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(FRAUD_FILE), exist_ok=True)

    def _load(self) -> list:
        if not os.path.exists(FRAUD_FILE):
            return []
        with open(FRAUD_FILE, "r") as f:
            try:
                data = json.load(f)
                return data if isinstance(data, list) else []
            except (json.JSONDecodeError, ValueError):
                return []

    def _save(self, data: list):
        with open(FRAUD_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def add_event(
        self,
        user_id: str,
        rule: str,
        score: int,
        reason: str,
        task_id: str = "",
        slot_index: int = -1,
        related_user_id: str = "",
        metadata: Optional[dict] = None,
    ) -> dict:
        """记录一条欺诈检测事件"""
        event = {
            "id": f"fraud_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{len(self._load())}",
            "user_id": user_id,
            "rule": rule,
            "score": score,
            "reason": reason,
            "task_id": task_id,
            "slot_index": slot_index,
            "related_user_id": related_user_id,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
        }
        with self._lock:
            data = self._load()
            data.append(event)
            self._save(data)
        return event

    def get_user_events(self, user_id: str, limit: int = 50) -> list:
        """获取用户的所有欺诈事件（最新优先）"""
        with self._lock:
            data = self._load()
        events = [e for e in data if e.get("user_id") == user_id]
        events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
        return events[:limit]

    def get_user_risk_score(self, user_id: str) -> int:
        """计算用户累计风险评分（只统计最近 90 天的事件）"""
        with self._lock:
            data = self._load()

        cutoff = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        try:
            from datetime import timedelta
            cutoff = (cutoff - timedelta(days=90)).isoformat()
        except Exception:
            cutoff = ""

        total = 0
        for e in data:
            if e.get("user_id") == user_id:
                if cutoff and e.get("created_at", "") < cutoff:
                    continue
                total += e.get("score", 0)
        return min(total, 100)  # 封顶 100

    def get_all_flagged_users(self) -> list:
        """获取所有有欺诈标记的用户（按风险评分排序）"""
        with self._lock:
            data = self._load()

        # 聚合每个用户的最近事件和总评分
        user_map = {}
        for e in data:
            uid = e.get("user_id")
            if uid not in user_map:
                user_map[uid] = {
                    "user_id": uid,
                    "total_score": 0,
                    "event_count": 0,
                    "latest_rule": "",
                    "latest_reason": "",
                    "latest_at": "",
                }
            user_map[uid]["total_score"] += e.get("score", 0)
            user_map[uid]["event_count"] += 1
            if e.get("created_at", "") > user_map[uid]["latest_at"]:
                user_map[uid]["latest_rule"] = e.get("rule", "")
                user_map[uid]["latest_reason"] = e.get("reason", "")
                user_map[uid]["latest_at"] = e.get("created_at", "")

        for uid in user_map:
            user_map[uid]["total_score"] = min(user_map[uid]["total_score"], 100)

        # 按风险评分排序
        result = sorted(user_map.values(), key=lambda u: u["total_score"], reverse=True)
        return result

    def get_task_events(self, task_id: str) -> list:
        """获取任务相关的所有欺诈事件"""
        with self._lock:
            data = self._load()
        return [e for e in data if e.get("task_id") == task_id]


fraud_store = FraudStore()
