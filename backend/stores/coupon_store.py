"""折扣码存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import CouponCode, CouponOrder

COUPON_FILE = os.path.join(OUTPUT_DIR, "coupons", "coupons.json")
ORDER_FILE = os.path.join(OUTPUT_DIR, "coupons", "orders.json")


class CouponStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(COUPON_FILE), exist_ok=True)

    def _load_coupons(self) -> dict:
        if not os.path.exists(COUPON_FILE):
            return {}
        with open(COUPON_FILE, "r") as f:
            return json.load(f)

    def _save_coupons(self, data: dict):
        with open(COUPON_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _load_orders(self) -> list:
        if not os.path.exists(ORDER_FILE):
            return []
        with open(ORDER_FILE, "r") as f:
            return json.load(f)

    def _save_orders(self, data: list):
        with open(ORDER_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, coupon: CouponCode) -> CouponCode:
        with self._lock:
            data = self._load_coupons()
            data[coupon.id] = coupon.model_dump()
            self._save_coupons(data)
        return coupon

    def get(self, coupon_id: str) -> CouponCode | None:
        with self._lock:
            data = self._load_coupons()
            c = data.get(coupon_id)
            return CouponCode(**c) if c else None

    def list_by_koc(self, koc_id: str) -> list[CouponCode]:
        with self._lock:
            data = self._load_coupons()
        return [CouponCode(**c) for c in data.values() if c.get("koc_id") == koc_id]

    def list_all(self) -> list[CouponCode]:
        with self._lock:
            data = self._load_coupons()
        return [CouponCode(**c) for c in data.values()]

    def add_order(self, coupon_id: str, order: CouponOrder):
        with self._lock:
            # 记录订单
            orders = self._load_orders()
            orders.append(order.model_dump())
            self._save_orders(orders)
            # 更新折扣码统计
            coupons = self._load_coupons()
            if coupon_id in coupons:
                coupons[coupon_id]["usage_count"] = coupons[coupon_id].get("usage_count", 0) + 1
                coupons[coupon_id]["total_revenue"] = coupons[coupon_id].get("total_revenue", 0) + order.amount
                self._save_coupons(coupons)

    def get_orders(self, coupon_id: str) -> list[dict]:
        with self._lock:
            orders = self._load_orders()
        return [o for o in orders if o.get("coupon_id") == coupon_id]


coupon_store = CouponStore()
