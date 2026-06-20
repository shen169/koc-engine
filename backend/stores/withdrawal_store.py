"""Withdrawal request store"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import WithdrawalRequest

WITHDRAWAL_FILE = os.path.join(OUTPUT_DIR, "credits", "withdrawals.json")


class WithdrawalStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(WITHDRAWAL_FILE), exist_ok=True)

    def _load(self) -> list:
        if not os.path.exists(WITHDRAWAL_FILE):
            return []
        with open(WITHDRAWAL_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: list):
        with open(WITHDRAWAL_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, withdrawal: WithdrawalRequest) -> WithdrawalRequest:
        with self._lock:
            data = self._load()
            data.append(withdrawal.model_dump())
            self._save(data)
        return withdrawal

    def get_by_user(self, user_id: str) -> list[WithdrawalRequest]:
        with self._lock:
            data = self._load()
        return [WithdrawalRequest(**w) for w in data if w.get("user_id") == user_id]

    def get_all(self, status: str = "") -> list[WithdrawalRequest]:
        with self._lock:
            data = self._load()
        result = [WithdrawalRequest(**w) for w in data]
        if status:
            result = [w for w in result if w.status == status]
        return result

    def get_by_id(self, withdrawal_id: str) -> WithdrawalRequest | None:
        with self._lock:
            data = self._load()
        for w in data:
            if w.get("id") == withdrawal_id:
                return WithdrawalRequest(**w)
        return None

    def update(self, withdrawal_id: str, updates: dict) -> WithdrawalRequest | None:
        with self._lock:
            data = self._load()
            for i, w in enumerate(data):
                if w.get("id") == withdrawal_id:
                    w.update(updates)
                    self._save(data)
                    return WithdrawalRequest(**w)
        return None


withdrawal_store = WithdrawalStore()
