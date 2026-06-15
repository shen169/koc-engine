"""双向互评路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Review
from stores.review_store import review_store
from stores.task_store import task_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["reviews"])


@router.post("/reviews")
def create_review(data: dict, current_user: dict = Depends(get_current_user)):
    """履约完成后：商家评 KOC 或 KOC 评商家"""
    role = current_user.get("role")
    if role not in ("koc", "merchant"):
        raise HTTPException(403, "Only KOC and merchant can review")

    task_id = data["task_id"]
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if not task.delivered:
        raise HTTPException(400, "Task not yet delivered")

    if role == "koc":
        reviewer_id = current_user["sub"]
        target_id = task.merchant_id
        dimensions = data.get("dimensions", {})  # 产品靠谱度/发货速度/履约诚信
    else:
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            raise HTTPException(404, "Merchant profile not found")
        reviewer_id = m.id
        target_id = task.koc_id
        dimensions = data.get("dimensions", {})  # 内容质量/配合度/带货效果

    review = Review(
        task_id=task_id,
        reviewer_role=role,
        reviewer_id=reviewer_id,
        target_id=target_id,
        rating=data.get("rating", 5),
        dimensions=dimensions,
        comment=data.get("comment", ""),
    )
    try:
        review_store.create(review)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # 更新被评方的 avg_rating
    avg = review_store.get_avg_rating(target_id)
    if role == "koc":
        # KOC 评商家 → 更新 merchant avg_rating
        merchant_store.update(target_id, {"avg_rating": avg})
    else:
        # 商家评 KOC → 更新 koc avg_rating
        koc_store.update(target_id, {"avg_rating": avg})

    return review.model_dump()


@router.get("/reviews")
def list_reviews(current_user: dict = Depends(get_current_user)):
    """看自己的评价 / admin 看全部"""
    if current_user.get("role") == "admin":
        return [r.model_dump() for r in review_store.list_all()]

    role = current_user.get("role")
    if role == "koc":
        target_id = current_user["sub"]
    elif role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        target_id = m.id if m else ""
    else:
        target_id = ""

    return [r.model_dump() for r in review_store.get_by_target(target_id)]
