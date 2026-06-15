"""意向 + 匹配存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Interest

INTEREST_FILE = os.path.join(OUTPUT_DIR, "interests", "interests.json")


class InterestStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(INTEREST_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(INTEREST_FILE):
            return {}
        with open(INTEREST_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(INTEREST_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, interest: Interest) -> Interest:
        with self._lock:
            data = self._load()
            # 防重复：同一对 from+to 已有 expressed 状态则跳过
            for i in data.values():
                if (i.get("from_id") == interest.from_id and
                        i.get("to_id") == interest.to_id and
                        i.get("to_type") == interest.to_type and
                        i.get("status") == "expressed"):
                    return Interest(**i)
            data[interest.id] = interest.model_dump()
            self._save(data)
        return interest

    def get(self, interest_id: str) -> Interest | None:
        with self._lock:
            data = self._load()
            i = data.get(interest_id)
            return Interest(**i) if i else None

    def update(self, interest_id: str, updates: dict) -> Interest | None:
        with self._lock:
            data = self._load()
            if interest_id not in data:
                return None
            data[interest_id].update(updates)
            self._save(data)
            return Interest(**data[interest_id])

    def list_by_from(self, from_id: str, from_role: str = None) -> list[Interest]:
        with self._lock:
            data = self._load()
        result = [Interest(**i) for i in data.values() if i.get("from_id") == from_id]
        if from_role:
            result = [r for r in result if r.from_role == from_role]
        return result

    def list_all(self, filters: dict = None) -> list[Interest]:
        with self._lock:
            data = self._load()
        interests = [Interest(**i) for i in data.values()]
        if filters:
            for key, val in filters.items():
                interests = [i for i in interests if getattr(i, key, None) == val]
        return interests

    def find_mutual(self) -> list[dict]:
        """找双向绿灯：KOC对产品有意向 + 该产品商家对该KOC有意向"""
        with self._lock:
            data = self._load()
        all_interests = [Interest(**i) for i in data.values()]
        koc_interests = [i for i in all_interests if i.from_role == "koc" and i.to_type == "product" and i.status == "expressed"]
        merchant_interests = [i for i in all_interests if i.from_role == "merchant" and i.to_type == "koc" and i.status == "expressed"]

        mutual = []
        for ki in koc_interests:
            # ki: KOC(id=from_id) 对 product(to_id) 有意向
            # 找这个产品的商家对该KOC的意向
            for mi in merchant_interests:
                if mi.to_id == ki.from_id:  # 商家对该KOC有意向
                    mutual.append({
                        "koc_interest_id": ki.id,
                        "merchant_interest_id": mi.id,
                        "koc_id": ki.from_id,
                        "merchant_id": mi.from_id,
                        "product_id": ki.to_id,
                        "koc_interest_at": ki.created_at,
                        "merchant_interest_at": mi.created_at,
                    })
        return mutual


interest_store = InterestStore()
