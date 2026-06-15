"""点数系统路由"""

from fastapi import APIRouter, Depends, HTTPException
from stores.credit_store import credit_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["credits"])


@router.get("/credits/balance")
def get_balance(current_user: dict = Depends(get_current_user)):
    balance = credit_store.get_balance(current_user["sub"])
    return {"user_id": current_user["sub"], "balance": balance}


@router.get("/credits/history")
def credit_history(current_user: dict = Depends(get_current_user)):
    return [t.model_dump() for t in credit_store.get_history(current_user["sub"])]


@router.post("/credits/reward")
def reward_credits(data: dict, current_user: dict = Depends(require_admin)):
    user_id = data["user_id"]
    amount = data["amount"]
    tx_type = data.get("type", "manual")
    note = data.get("note", "")
    ref_id = data.get("ref_id", "")

    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")

    tx = credit_store.add_credits(user_id, amount, tx_type, ref_id, note)
    return tx.model_dump()
