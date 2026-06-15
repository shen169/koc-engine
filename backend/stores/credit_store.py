"""点数存储 — KOC Engine 自有点数系统"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import CreditTransaction

CREDITS_FILE = os.path.join(OUTPUT_DIR, "credits", "credits.json")
BALANCE_FILE = os.path.join(OUTPUT_DIR, "credits", "balances.json")


class CreditStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(CREDITS_FILE), exist_ok=True)

    def _load_balances(self) -> dict:
        if not os.path.exists(BALANCE_FILE):
            return {}
        with open(BALANCE_FILE, "r") as f:
            return json.load(f)

    def _save_balances(self, data: dict):
        with open(BALANCE_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _load_transactions(self) -> list:
        if not os.path.exists(CREDITS_FILE):
            return []
        with open(CREDITS_FILE, "r") as f:
            return json.load(f)

    def _save_transactions(self, data: list):
        with open(CREDITS_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_balance(self, user_id: str) -> int:
        with self._lock:
            balances = self._load_balances()
            return balances.get(user_id, 0)

    def set_initial_balance(self, user_id: str, amount: int):
        with self._lock:
            balances = self._load_balances()
            if user_id not in balances:
                balances[user_id] = amount
                self._save_balances(balances)

    def add_credits(self, user_id: str, amount: int, tx_type: str, ref_id: str = "", note: str = "") -> CreditTransaction:
        """正数=入账"""
        with self._lock:
            balances = self._load_balances()
            balances[user_id] = balances.get(user_id, 0) + amount
            self._save_balances(balances)

            txs = self._load_transactions()
            tx = CreditTransaction(
                user_id=user_id, amount=amount, type=tx_type,
                ref_id=ref_id, note=note)
            txs.append(tx.model_dump())
            self._save_transactions(txs)
        return tx

    def deduct_credits(self, user_id: str, amount: int, tx_type: str, ref_id: str = "", note: str = "") -> CreditTransaction | None:
        """扣点，余额不足返回 None"""
        with self._lock:
            balances = self._load_balances()
            if balances.get(user_id, 0) < amount:
                return None
            balances[user_id] -= amount
            self._save_balances(balances)

            txs = self._load_transactions()
            tx = CreditTransaction(
                user_id=user_id, amount=-amount, type=tx_type,
                ref_id=ref_id, note=note)
            txs.append(tx.model_dump())
            self._save_transactions(txs)
        return tx

    def get_history(self, user_id: str) -> list[CreditTransaction]:
        with self._lock:
            txs = self._load_transactions()
        return [CreditTransaction(**t) for t in txs if t.get("user_id") == user_id]

    def get_all_history(self) -> list[CreditTransaction]:
        with self._lock:
            txs = self._load_transactions()
        return [CreditTransaction(**t) for t in txs]


credit_store = CreditStore()
