"""裂变推荐存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Referral

REFERRAL_FILE = os.path.join(OUTPUT_DIR, "referrals", "referrals.json")


class ReferralStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(REFERRAL_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(REFERRAL_FILE):
            return {}
        with open(REFERRAL_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(REFERRAL_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, ref: Referral) -> Referral:
        with self._lock:
            data = self._load()
            data[ref.id] = ref.model_dump()
            self._save(data)
        return ref

    def get_by_code(self, code: str) -> Referral | None:
        with self._lock:
            data = self._load()
            for r in data.values():
                if r.get("referral_code") == code:
                    return Referral(**r)
        return None

    def list_by_referrer(self, koc_id: str) -> list[Referral]:
        with self._lock:
            data = self._load()
        return [Referral(**r) for r in data.values() if r.get("referrer_koc_id") == koc_id]

    def list_all(self) -> list[Referral]:
        with self._lock:
            data = self._load()
        return [Referral(**r) for r in data.values()]

    def update(self, ref_id: str, updates: dict) -> Referral | None:
        with self._lock:
            data = self._load()
            if ref_id not in data:
                return None
            data[ref_id].update(updates)
            self._save(data)
            return Referral(**data[ref_id])


referral_store = ReferralStore()
