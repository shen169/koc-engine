"""举报存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Report

REPORT_FILE = os.path.join(OUTPUT_DIR, "reports", "reports.json")


class ReportStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(REPORT_FILE):
            return {}
        with open(REPORT_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(REPORT_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, report: Report) -> Report:
        with self._lock:
            data = self._load()
            data[report.id] = report.model_dump()
            self._save(data)
        return report

    def get(self, report_id: str) -> Report | None:
        with self._lock:
            data = self._load()
            r = data.get(report_id)
            return Report(**r) if r else None

    def update(self, report_id: str, updates: dict) -> Report | None:
        with self._lock:
            data = self._load()
            if report_id not in data:
                return None
            data[report_id].update(updates)
            self._save(data)
            return Report(**data[report_id])

    def list_all(self, status: str = None) -> list[Report]:
        with self._lock:
            data = self._load()
        reports = [Report(**r) for r in data.values()]
        if status:
            reports = [r for r in reports if r.status == status]
        return sorted(reports, key=lambda r: r.created_at, reverse=True)

    def list_by_entity(self, entity_id: str) -> list[Report]:
        with self._lock:
            data = self._load()
        reports = [Report(**r) for r in data.values()
                   if r.get("reported_entity_id") == entity_id]
        return sorted(reports, key=lambda r: r.created_at, reverse=True)


report_store = ReportStore()
