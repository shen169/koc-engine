"""产品路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Product
from stores.product_store import product_store
from stores.merchant_store import merchant_store
from auth import get_current_user, require_merchant, require_admin

router = APIRouter(tags=["products"])


@router.post("/products")
def create_product(data: dict, current_user: dict = Depends(require_merchant)):
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m:
        raise HTTPException(404, "Create merchant profile first")
    product = Product(
        merchant_id=m.id,
        asin=data.get("asin", ""),
        name=data["name"],
        image_url=data.get("image_url", ""),
        category=data.get("category", ""),
        commission_type=data.get("commission_type", "discount_code"),
        commission_value=data.get("commission_value", ""),
        commission_link=data.get("commission_link", ""),
        description=data.get("description", ""),
        target_market=data.get("target_market", ""),
    )
    product_store.create(product)
    return product.model_dump()


@router.get("/products")
def list_products(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            return []
        return [p.model_dump() for p in product_store.list_by_merchant(m.id)]
    elif role == "koc":
        # KOC 只能看 active 产品，补上商家信息方便决策
        result = []
        for p in product_store.list_active():
            d = p.model_dump()
            if p.merchant_id:
                m = merchant_store.get(p.merchant_id)
                if m:
                    d["merchant_company"] = m.company_name
                    d["merchant_trust_score"] = m.trust_score
                    d["merchant_tier"] = m.tier
            result.append(d)
        return result
    elif role == "admin":
        return [p.model_dump() for p in product_store.list_all()]
    return []


@router.get("/products/{product_id}")
def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    p = product_store.get(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return p.model_dump()


@router.put("/products/{product_id}")
def update_product(product_id: str, updates: dict, current_user: dict = Depends(require_merchant)):
    p = product_store.get(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    m = merchant_store.get_by_user_id(current_user["sub"])
    if not m or p.merchant_id != m.id:
        if current_user.get("role") != "admin":
            raise HTTPException(403, "Not your product")
    allowed = {"name", "image_url", "category", "commission_type", "commission_value", "commission_link", "description", "target_market", "status"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    updated = product_store.update(product_id, safe)
    return updated.model_dump()
