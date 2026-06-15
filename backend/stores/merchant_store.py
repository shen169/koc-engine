"""商家档案存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Merchant

MERCHANT_FILE = os.path.join(OUTPUT_DIR, "merchants", "merchants.json")


class MerchantStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(MERCHANT_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(MERCHANT_FILE):
            return {}
        with open(MERCHANT_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(MERCHANT_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get(self, merchant_id: str) -> Merchant | None:
        with self._lock:
            data = self._load()
            m = data.get(merchant_id)
            return Merchant(**m) if m else None

    def get_by_user_id(self, user_id: str) -> Merchant | None:
        with self._lock:
            data = self._load()
            for m in data.values():
                if m.get("user_id") == user_id:
                    return Merchant(**m)
        return None

    def create(self, merchant: Merchant) -> Merchant:
        with self._lock:
            data = self._load()
            data[merchant.id] = merchant.model_dump()
            self._save(data)
        return merchant

    def update(self, merchant_id: str, updates: dict) -> Merchant | None:
        with self._lock:
            data = self._load()
            if merchant_id not in data:
                return None
            data[merchant_id].update(updates)
            self._save(data)
            return Merchant(**data[merchant_id])

    def list_all(self) -> list[Merchant]:
        with self._lock:
            data = self._load()
        return [Merchant(**m) for m in data.values()]


merchant_store = MerchantStore()
