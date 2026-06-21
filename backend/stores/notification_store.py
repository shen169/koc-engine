"""Notification store — JSON file + threading.Lock"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Notification

NOTIF_FILE = os.path.join(OUTPUT_DIR, "notifications", "notifications.json")


class NotificationStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(NOTIF_FILE), exist_ok=True)

    def _load(self) -> list:
        if not os.path.exists(NOTIF_FILE):
            return []
        with open(NOTIF_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: list):
        with open(NOTIF_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, notification: Notification) -> Notification:
        with self._lock:
            data = self._load()
            data.append(notification.model_dump())
            self._save(data)
        return notification

    def list_by_user(self, user_id: str, limit: int = 50) -> list[Notification]:
        with self._lock:
            data = self._load()
        user_notifs = [n for n in data if n.get("user_id") == user_id]
        user_notifs.sort(key=lambda n: n.get("created_at", ""), reverse=True)
        return [Notification(**n) for n in user_notifs[:limit]]

    def unread_count(self, user_id: str) -> int:
        with self._lock:
            data = self._load()
        return len([n for n in data if n.get("user_id") == user_id and not n.get("read", False)])

    def mark_read(self, notif_id: str, user_id: str) -> bool:
        with self._lock:
            data = self._load()
            for n in data:
                if n.get("id") == notif_id and n.get("user_id") == user_id:
                    n["read"] = True
                    self._save(data)
                    return True
        return False

    def mark_all_read(self, user_id: str) -> int:
        count = 0
        with self._lock:
            data = self._load()
            for n in data:
                if n.get("user_id") == user_id and not n.get("read", False):
                    n["read"] = True
                    count += 1
            self._save(data)
        return count


notification_store = NotificationStore()
