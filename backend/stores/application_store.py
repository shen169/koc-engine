"""申请记录存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Application

APP_FILE = os.path.join(OUTPUT_DIR, "applications", "applications.json")


class ApplicationStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(APP_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(APP_FILE):
            return {}
        with open(APP_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(APP_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, app: Application) -> Application:
        with self._lock:
            data = self._load()
            data[app.id] = app.model_dump()
            self._save(data)
        return app

    def get(self, app_id: str) -> Application | None:
        with self._lock:
            data = self._load()
            a = data.get(app_id)
            return Application(**a) if a else None

    def update(self, app_id: str, updates: dict) -> Application | None:
        with self._lock:
            data = self._load()
            if app_id not in data:
                return None
            data[app_id].update(updates)
            self._save(data)
            return Application(**data[app_id])

    def list_all(self, filters: dict = None) -> list[Application]:
        with self._lock:
            data = self._load()
        apps = [Application(**a) for a in data.values()]
        if filters:
            for key, val in filters.items():
                apps = [a for a in apps if getattr(a, key, None) == val]
        return sorted(apps, key=lambda a: a.applied_at, reverse=True)


application_store = ApplicationStore()
