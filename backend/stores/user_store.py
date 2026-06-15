"""用户/认证存储"""

import json
import os
import threading
from config import OUTPUT_DIR
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


user_store = UserStore()
