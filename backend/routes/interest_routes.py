"""意向表达 + 匹配路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Interest
from stores.interest_store import interest_store
from stores.merchant_store import merchant_store
from stores.koc_store import koc_store
from stores.user_store import user_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["interests"])


@router.post("/interests")
def express_interest(data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 对产品 / 商家对 KOC 表达意向"""
    role = current_user.get("role")
    to_type = data.get("to_type")  # product | koc
    to_id = data["to_id"]

    if role == "koc":
        if to_type != "product":
            raise HTTPException(400, "KOC can only express interest in products")
        # 用 user email 找到对应的 KOC profile
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        if not koc:
            raise HTTPException(404, "KOC profile not found — apply first")
        from_id = koc.id
    elif role == "merchant":
        if to_type != "koc":
            raise HTTPException(400, "Merchant can only express interest in KOCs")
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            raise HTTPException(404, "Create merchant profile first")
        from_id = m.id
    else:
        raise HTTPException(403, "Only KOC and merchant can express interest")

    interest = Interest(
        from_role=role,
        from_id=from_id,
        to_id=to_id,
        to_type=to_type,
    )
    interest_store.create(interest)
    return interest.model_dump()


@router.get("/interests")
def list_my_interests(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "koc":
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        koc_id = koc.id if koc else current_user["sub"]
        interests = interest_store.list_by_from(koc_id, "koc")
    elif role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            return []
        interests = interest_store.list_by_from(m.id, "merchant")
    else:
        interests = interest_store.list_all()
    return [i.model_dump() for i in interests]


@router.get("/interests/matches")
def get_mutual_matches(current_user: dict = Depends(require_admin)):
    """Admin 看所有双向绿灯"""
    mutual = interest_store.find_mutual()
    # 补全信息
    enriched = []
    for m in mutual:
        koc = koc_store.get(m["koc_id"])
        merchant = merchant_store.get(m["merchant_id"])
        enriched.append({
            **m,
            "koc_display_name": koc.display_name if koc else "Unknown",
            "merchant_company": merchant.company_name if merchant else "Unknown",
        })
    return enriched


@router.put("/interests/{interest_id}/match")
def match_interest(interest_id: str, current_user: dict = Depends(require_admin)):
    """Admin 确认匹配"""
    interest = interest_store.get(interest_id)
    if not interest:
        raise HTTPException(404, "Interest not found")
    updated = interest_store.update(interest_id, {
        "status": "matched",
        "matched_by": current_user["sub"],
        "matched_at": __import__("datetime").datetime.utcnow().isoformat(),
    })
    return updated.model_dump()


@router.put("/interests/{interest_id}/decline")
def decline_interest(interest_id: str, current_user: dict = Depends(require_admin)):
    interest = interest_store.get(interest_id)
    if not interest:
        raise HTTPException(404, "Interest not found")
    updated = interest_store.update(interest_id, {"status": "declined"})
    return updated.model_dump()
