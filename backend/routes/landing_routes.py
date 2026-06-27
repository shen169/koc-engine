"""落地页公开 API"""

from fastapi import APIRouter
from stores.koc_store import koc_store
from stores.product_store import product_store
from stores.task_store import task_store

router = APIRouter(tags=["landing"])


@router.get("/landing/stats")
def landing_stats():
    all_kocs = koc_store.list_all()
    approved = [k for k in all_kocs if k.status != "Applied"]
    all_tasks = task_store.list_all()
    delivered = [t for t in all_tasks if t.delivered]

    return {
        "total_kocs": len(approved),
        "total_videos": len(delivered),
        "active_products": len(product_store.list_active()),
    }


@router.get("/landing/products")
def landing_products():
    """KOC 招募落地页展示的产品"""
    products = product_store.list_active()
    return [
        {
            "id": p.id,
            "name": p.name,
            "image_url": p.image_url,
            "category": p.category,
            "description": p.description,
        }
        for p in products
    ]
