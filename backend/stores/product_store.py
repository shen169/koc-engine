"""产品存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Product

PRODUCT_FILE = os.path.join(OUTPUT_DIR, "products", "products.json")


class ProductStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(PRODUCT_FILE), exist_ok=True)

    def _load(self) -> dict:
        if not os.path.exists(PRODUCT_FILE):
            return {}
        with open(PRODUCT_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(PRODUCT_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, product: Product) -> Product:
        with self._lock:
            data = self._load()
            data[product.id] = product.model_dump()
            self._save(data)
        return product

    def get(self, product_id: str) -> Product | None:
        with self._lock:
            data = self._load()
            p = data.get(product_id)
            return Product(**p) if p else None

    def update(self, product_id: str, updates: dict) -> Product | None:
        with self._lock:
            data = self._load()
            if product_id not in data:
                return None
            data[product_id].update(updates)
            self._save(data)
            return Product(**data[product_id])

    def list_by_merchant(self, merchant_id: str) -> list[Product]:
        with self._lock:
            data = self._load()
        return [Product(**p) for p in data.values() if p.get("merchant_id") == merchant_id]

    def list_active(self) -> list[Product]:
        with self._lock:
            data = self._load()
        return [Product(**p) for p in data.values() if p.get("status") == "active"]

    def list_all(self) -> list[Product]:
        with self._lock:
            data = self._load()
        return [Product(**p) for p in data.values()]


product_store = ProductStore()
