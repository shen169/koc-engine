"""任务/履约存储"""

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

    def list_by_koc(self, koc_id: str) -> list[KocTask]:
        with self._lock:
            data = self._load()
        return [KocTask(**t) for t in data.values() if t.get("koc_id") == koc_id]

    def list_by_merchant(self, merchant_id: str) -> list[KocTask]:
        with self._lock:
            data = self._load()
        return [KocTask(**t) for t in data.values() if t.get("merchant_id") == merchant_id]

    def list_all(self, filters: dict = None) -> list[KocTask]:
        with self._lock:
            data = self._load()
        tasks = [KocTask(**t) for t in data.values()]
        if filters:
            for key, val in filters.items():
                tasks = [t for t in tasks if getattr(t, key, None) == val]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)


task_store = TaskStore()
