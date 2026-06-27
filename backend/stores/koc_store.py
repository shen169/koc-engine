"""KOC 档案存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import KocProfile

KOC_FILE = os.path.join(OUTPUT_DIR, "koc_profiles", "koc_profiles.json")


class KocStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(KOC_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(KOC_FILE):
            return {}
        with open(KOC_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(KOC_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get(self, koc_id: str) -> KocProfile | None:
        with self._lock:
            data = self._load()
            k = data.get(koc_id)
            return KocProfile(**k) if k else None

    def get_by_email(self, email: str) -> KocProfile | None:
        with self._lock:
            data = self._load()
            for k in data.values():
                if k.get("email") == email:
                    return KocProfile(**k)
        return None

    def get_by_handle(self, platform: str, handle: str) -> KocProfile | None:
        with self._lock:
            data = self._load()
            for k in data.values():
                if k.get("platform") == platform and k.get("handle") == handle:
                    return KocProfile(**k)
        return None

    def get_by_handle_any_platform(self, handle: str) -> KocProfile | None:
        """查找任意平台上同 handle 的 KOC（防多号注册同一社交账号）"""
        if not handle:
            return None
        with self._lock:
            data = self._load()
            for k in data.values():
                if k.get("handle", "").lower() == handle.lower():
                    return KocProfile(**k)
        return None

    def get_by_profile_url(self, profile_url: str) -> KocProfile | None:
        """查找同 profile_url 的 KOC（防多号绑同一主页）"""
        if not profile_url:
            return None
        normalized = profile_url.strip().rstrip("/").lower()
        with self._lock:
            data = self._load()
            for k in data.values():
                existing = (k.get("profile_url") or "").strip().rstrip("/").lower()
                if existing == normalized:
                    return KocProfile(**k)
        return None

    def create(self, koc: KocProfile) -> KocProfile:
        with self._lock:
            data = self._load()
            # 去重——内联检查避免锁重入
            for k in data.values():
                if k.get("platform") == koc.platform and k.get("handle") == koc.handle:
                    return KocProfile(**k)
            data[koc.id] = koc.model_dump()
            self._save(data)
        return koc

    def update(self, koc_id: str, updates: dict) -> KocProfile | None:
        with self._lock:
            data = self._load()
            if koc_id not in data:
                return None
            data[koc_id].update(updates)
            self._save(data)
            return KocProfile(**data[koc_id])

    def list_all(self, filters: dict = None) -> list[KocProfile]:
        with self._lock:
            data = self._load()
        kocs = [KocProfile(**k) for k in data.values()]
        if filters:
            for key, val in filters.items():
                kocs = [k for k in kocs if getattr(k, key, None) == val]
        return kocs

    def list_pool(self, exclude_blacklisted: bool = True) -> list[dict]:
        """商家视角KOC池——匿名，不含联系方式"""
        kocs = self.list_all({"status": "Approved"} if not exclude_blacklisted else None)
        result = []
        for k in kocs:
            if exclude_blacklisted and k.is_blacklisted:
                continue
            if k.status not in ("Approved", "SampleSent", "Submitted", "Delivered", "Collaborating", "Upgraded"):
                continue
            result.append({
                "id": k.id,
                "display_name": k.display_name or f"Creator_{k.id[:6]}",
                "platform": k.platform,
                "tier": k.tier,
                "niche_tags": k.niche_tags,
                "score_total": k.score_total,
                "avg_rating": k.avg_rating,
                "completed_tasks": k.completed_tasks,
                "region": k.region,
                "follower_count": k.follower_count,
                "trust_score": k.trust_score,
            })
        return result


koc_store = KocStore()
