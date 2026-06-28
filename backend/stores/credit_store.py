"""Points store — dual-bucket balance (withdrawable + bonus)"""

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

    # ── Balance helpers ──

    def _load_balances(self) -> dict:
        if not os.path.exists(BALANCE_FILE):
            return {}
        with open(BALANCE_FILE, "r") as f:
            raw = json.load(f)
        # Migrate old format: {uid: int} → {uid: {total, withdrawable, bonus}}
        for uid, val in list(raw.items()):
            if isinstance(val, int):
                raw[uid] = {"total": val, "withdrawable": 0, "bonus": val}
        return raw

    def _save_balances(self, data: dict):
        with open(BALANCE_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _ensure_balance(self, user_id: str, balances: dict):
        if user_id not in balances:
            balances[user_id] = {"total": 0, "withdrawable": 0, "bonus": 0}

    def get_balance(self, user_id: str) -> dict:
        """Return {total, withdrawable, bonus} for user."""
        with self._lock:
            balances = self._load_balances()
            self._ensure_balance(user_id, balances)
            return dict(balances[user_id])

    def get_total(self, user_id: str) -> int:
        return self.get_balance(user_id)["total"]

    def get_withdrawable(self, user_id: str) -> int:
        return self.get_balance(user_id)["withdrawable"]

    def set_initial_balance(self, user_id: str, amount: int):
        """Set registration bonus (non-withdrawable).  Only sets if user has no balance yet."""
        with self._lock:
            balances = self._load_balances()
            existing = balances.get(user_id)
            # Old format (int) or new format (dict) with 0 total — set initial balance
            is_empty = (
                existing is None
                or (isinstance(existing, int) and existing == 0)
                or (isinstance(existing, dict) and existing.get("total", 0) == 0)
            )
            if is_empty:
                balances[user_id] = {"total": amount, "withdrawable": 0, "bonus": amount}
                self._save_balances(balances)

    # ── Transaction methods ──

    def _load_transactions(self) -> list:
        if not os.path.exists(CREDITS_FILE):
            return []
        with open(CREDITS_FILE, "r") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return []
        return data

    def _save_transactions(self, data: list):
        with open(CREDITS_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def add_credits(self, user_id: str, amount: int, tx_type: str,
                    ref_id: str = "", note: str = "",
                    withdrawable: bool = False) -> CreditTransaction:
        """Add credits. withdrawable=True → earned pts; False → bonus pts."""
        with self._lock:
            balances = self._load_balances()
            self._ensure_balance(user_id, balances)
            b = balances[user_id]
            b["total"] += amount
            if withdrawable:
                b["withdrawable"] += amount
            else:
                b["bonus"] += amount
            self._save_balances(balances)

            txs = self._load_transactions()
            tx = CreditTransaction(
                user_id=user_id, amount=amount, type=tx_type,
                ref_id=ref_id, note=note, withdrawable=withdrawable)
            txs.append(tx.model_dump())
            self._save_transactions(txs)
        return tx

    def deduct_credits(self, user_id: str, amount: int, tx_type: str,
                       ref_id: str = "", note: str = "",
                       prefer_withdrawable: bool = False) -> CreditTransaction | None:
        """
        Deduct credits. By default deducts from bonus first, then withdrawable.
        Set prefer_withdrawable=True for withdrawals (only draw from withdrawable).
        Returns None if insufficient balance.
        """
        with self._lock:
            balances = self._load_balances()
            self._ensure_balance(user_id, balances)
            b = balances[user_id]
            if b["total"] < amount:
                return None

            remaining = amount
            bonus_deducted = 0
            withdrawable_deducted = 0

            if prefer_withdrawable:
                # Withdrawal mode: only from withdrawable
                if b["withdrawable"] < amount:
                    return None
                b["withdrawable"] -= amount
                withdrawable_deducted = amount
            else:
                # Normal mode: bonus first, then withdrawable
                from_bonus = min(b["bonus"], remaining)
                b["bonus"] -= from_bonus
                bonus_deducted = from_bonus
                remaining -= from_bonus
                if remaining > 0:
                    b["withdrawable"] -= remaining
                    withdrawable_deducted = remaining

            b["total"] -= amount
            self._save_balances(balances)

            txs = self._load_transactions()
            tx = CreditTransaction(
                user_id=user_id, amount=-amount, type=tx_type,
                ref_id=ref_id, note=note, withdrawable=False)
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
