"""折扣码路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import CouponCode, CouponOrder
from stores.coupon_store import coupon_store
from stores.koc_store import koc_store
from auth import get_current_user, require_admin
import random
import string

router = APIRouter(tags=["coupons"])


def _gen_code(handle: str) -> str:
    prefix = "".join(c.upper() for c in handle if c.isalnum())[:4]
    suffix = "".join(random.choices(string.digits, k=2))
    return f"{prefix}{suffix}"


@router.post("/coupons")
def create_coupon(data: dict, current_user: dict = Depends(require_admin)):
    koc = koc_store.get(data["koc_id"])
    if not koc:
        raise HTTPException(404, "KOC not found")

    code = data.get("code") or _gen_code(koc.handle or koc.display_name)
    coupon = CouponCode(
        koc_id=data["koc_id"],
        code=code,
        product_asin=data.get("product_asin", ""),
        discount_percent=data.get("discount_percent", 15),
    )
    coupon_store.create(coupon)

    # 回写到 KOC 档案
    koc_store.update(koc.id, {"coupon_code": code})

    return coupon.model_dump()


@router.get("/coupons")
def list_my_coupons(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "koc":
        coupons = coupon_store.list_by_koc(current_user["sub"])
    elif current_user.get("role") == "admin":
        coupons = coupon_store.list_all()
    else:
        coupons = []
    return [c.model_dump() for c in coupons]


@router.get("/coupons/{coupon_id}/usage")
def coupon_usage(coupon_id: str, current_user: dict = Depends(get_current_user)):
    orders = coupon_store.get_orders(coupon_id)
    return orders


@router.post("/coupons/{coupon_id}/orders")
def add_order(coupon_id: str, data: dict, current_user: dict = Depends(require_admin)):
    order = CouponOrder(
        order_id=data["order_id"],
        coupon_id=coupon_id,
        amount=data.get("amount", 0.0),
        date=data.get("date", ""),
    )
    coupon_store.add_order(coupon_id, order)
    return {"status": "ok"}


@router.post("/coupons/batch-import")
def batch_import_orders(data: dict, current_user: dict = Depends(require_admin)):
    """CSV 批量导入订单 [{order_id, coupon_code, amount, date}, ...]"""
    orders = data.get("orders", [])
    count = 0
    for order_data in orders:
        code = order_data.get("coupon_code", "")
        # 找到对应折扣码
        all_coupons = coupon_store.list_all()
        matched = [c for c in all_coupons if c.code == code]
        if matched:
            order = CouponOrder(
                order_id=order_data.get("order_id", ""),
                coupon_id=matched[0].id,
                amount=order_data.get("amount", 0.0),
                date=order_data.get("date", ""),
            )
            coupon_store.add_order(matched[0].id, order)
            count += 1
    return {"imported": count, "total": len(orders)}
