"""双向黑名单存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import BlacklistEntry

BL_FILE = os.path.join(OUTPUT_DIR, "blacklist", "blacklist.json")


class BlacklistStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(BL_FILE), exist_ok=True)

    def _load(self) -> list:
        if not os.path.exists(BL_FILE):
            return []
        with open(BL_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: list):
        with open(BL_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def add(self, entry: BlacklistEntry) -> BlacklistEntry:
        with self._lock:
            data = self._load()
            # 防重复
            for e in data:
                if (e.get("created_by_id") == entry.created_by_id and
                        e.get("target_id") == entry.target_id):
                    return BlacklistEntry(**e)
            data.append(entry.model_dump())
            self._save(data)
        return entry

    def is_blocked(self, by_id: str, target_id: str) -> bool:
        with self._lock:
            data = self._load()
        for e in data:
            if e.get("created_by_id") == by_id and e.get("target_id") == target_id:
                return True
        return False

    def list_by_creator(self, created_by_id: str) -> list[BlacklistEntry]:
        with self._lock:
            data = self._load()
        return [BlacklistEntry(**e) for e in data if e.get("created_by_id") == created_by_id]

    def list_all(self) -> list[BlacklistEntry]:
        with self._lock:
            data = self._load()
        return [BlacklistEntry(**e) for e in data]


blacklist_store = BlacklistStore()
