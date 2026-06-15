"""商家档案路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Merchant
from stores.merchant_store import merchant_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["merchants"])


@router.post("/merchants")
def create_merchant(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchants can create profiles")
    existing = merchant_store.get_by_user_id(current_user["sub"])
    if existing:
        raise HTTPException(400, "Merchant profile already exists")
    merchant = Merchant(
        user_id=current_user["sub"],
        company_name=data.get("company_name", ""),
        website=data.get("website", ""),
        amazon_storefront=data.get("amazon_storefront", ""),
        product_categories=data.get("product_categories", []),
    )
    merchant_store.create(merchant)
    return merchant.model_dump()


@router.get("/merchants/me")
def get_my_merchant(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Not a merchant")
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m:
        raise HTTPException(404, "Merchant profile not found — create one first")
    return m.model_dump()


@router.put("/merchants/me")
def update_my_merchant(updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Not a merchant")
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m:
        raise HTTPException(404, "Merchant profile not found")
    allowed = {"company_name", "website", "amazon_storefront", "product_categories"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    updated = merchant_store.update(m.id, safe)
    return updated.model_dump()


@router.get("/merchants")
def list_merchants(current_user: dict = Depends(require_admin)):
    return [m.model_dump() for m in merchant_store.list_all()]
