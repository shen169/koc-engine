"""用户/认证存储"""

import json
import os
import threading
from datetime import datetime, timezone, timedelta
from config import OUTPUT_DIR, KOC_REGISTRATION_IP_WINDOW_DAYS
from models import User

USERS_FILE = os.path.join(OUTPUT_DIR, "users", "users.json")


class UserStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(USERS_FILE):
            return {}
        with open(USERS_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(USERS_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_by_email(self, email: str) -> User | None:
        with self._lock:
            data = self._load()
            for u in data.values():
                if u.get("email") == email:
                    return User(**u)
        return None

    def get_by_id(self, user_id: str) -> User | None:
        with self._lock:
            data = self._load()
            u = data.get(user_id)
            return User(**u) if u else None

    def create(self, user: User) -> User:
        with self._lock:
            data = self._load()
            if any(u.get("email") == user.email for u in data.values()):
                raise ValueError("Email already registered")
            data[user.id] = user.model_dump()
            self._save(data)
        return user

    def list_all(self) -> list[User]:
        with self._lock:
            data = self._load()
        return [User(**u) for u in data.values()]

    def get_by_ip(self, ip: str) -> list[User]:
        """查找同 IP 注册的所有用户（用于防双角色注册）"""
        if not ip:
            return []
        with self._lock:
            data = self._load()
        return [User(**u) for u in data.values() if u.get("registration_ip") == ip]

    def count_recent_koc_by_ip(self, ip: str, window_days: int = None) -> int:
        """统计同 IP 在时间窗口内注册的 KOC 数量（用于防多号注册）"""
        if not ip:
            return 0
        if window_days is None:
            window_days = KOC_REGISTRATION_IP_WINDOW_DAYS
        cutoff = (datetime.now(timezone.utc) - timedelta(days=window_days)).isoformat()
        with self._lock:
            data = self._load()
        count = 0
        for u in data.values():
            if u.get("registration_ip") != ip:
                continue
            if u.get("role") != "koc":
                continue
            if u.get("created_at", "") >= cutoff:
                count += 1
        return count

    def count_merchant_by_ip(self, ip: str) -> int:
        """统计同 IP 注册的商家数量（全时段，不限窗口）"""
        if not ip:
            return 0
        with self._lock:
            data = self._load()
        return sum(1 for u in data.values() if u.get("registration_ip") == ip and u.get("role") == "merchant")


user_store = UserStore()
