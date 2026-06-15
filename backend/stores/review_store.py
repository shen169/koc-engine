"""双向互评存储"""

import json
import os
import threading
from config import OUTPUT_DIR
from models import Review

REVIEW_FILE = os.path.join(OUTPUT_DIR, "reviews", "reviews.json")


class ReviewStore:
    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(REVIEW_FILE), exist_ok=True)

    def _load(self) -> list:
        if not os.path.exists(REVIEW_FILE):
            return []
        with open(REVIEW_FILE, "r") as f:
            return json.load(f)

    def _save(self, data: list):
        with open(REVIEW_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create(self, review: Review) -> Review:
        with self._lock:
            data = self._load()
            # 同 task + 同 reviewer 不能重复评价
            for r in data:
                if r.get("task_id") == review.task_id and r.get("reviewer_id") == review.reviewer_id:
                    raise ValueError("Already reviewed this task")
            data.append(review.model_dump())
            self._save(data)
        return review

    def get_by_target(self, target_id: str) -> list[Review]:
        with self._lock:
            data = self._load()
        return [Review(**r) for r in data if r.get("target_id") == target_id]

    def get_avg_rating(self, target_id: str) -> float:
        reviews = self.get_by_target(target_id)
        if not reviews:
            return 0.0
        return sum(r.rating for r in reviews) / len(reviews)

    def list_all(self) -> list[Review]:
        with self._lock:
            data = self._load()
        return [Review(**r) for r in data]


review_store = ReviewStore()
