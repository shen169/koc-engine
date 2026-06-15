"""双向黑名单路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import BlacklistEntry
from stores.blacklist_store import blacklist_store
from stores.merchant_store import merchant_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["blacklist"])


@router.post("/blacklist")
def add_to_blacklist(data: dict, current_user: dict = Depends(get_current_user)):
    """拉黑：商家拉黑 KOC / KOC 拉黑商家"""
    role = current_user.get("role")
    if role not in ("koc", "merchant", "admin"):
        raise HTTPException(403, "Unauthorized")

    target_role = data["target_role"]  # koc | merchant
    target_id = data["target_id"]

    if role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            raise HTTPException(404, "Merchant profile not found")
        created_by_id = m.id
    else:
        created_by_id = current_user["sub"]

    entry = BlacklistEntry(
        created_by_role=role,
        created_by_id=created_by_id,
        target_role=target_role,
        target_id=target_id,
        reason=data.get("reason", ""),
    )
    blacklist_store.add(entry)
    return entry.model_dump()


@router.get("/blacklist")
def list_my_blacklist(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        return [e.model_dump() for e in blacklist_store.list_all()]

    role = current_user.get("role")
    if role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        created_by_id = m.id if m else current_user["sub"]
    else:
        created_by_id = current_user["sub"]

    return [e.model_dump() for e in blacklist_store.list_by_creator(created_by_id)]


@router.get("/blacklist/check")
def check_blacklist(by_id: str, target_id: str, current_user: dict = Depends(require_admin)):
    blocked = blacklist_store.is_blocked(by_id, target_id)
    return {"blocked": blocked}
