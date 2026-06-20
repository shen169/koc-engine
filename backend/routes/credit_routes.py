"""Credit system routes"""

from fastapi import APIRouter, Depends, HTTPException
from stores.credit_store import credit_store
from stores.withdrawal_store import withdrawal_store
from models import WithdrawalRequest
from auth import get_current_user, require_admin
from stores.user_store import user_store

router = APIRouter(tags=["credits"])


@router.get("/credits/balance")
def get_balance(current_user: dict = Depends(get_current_user)):
    balance = credit_store.get_balance(current_user["sub"])
    return {
        "user_id": current_user["sub"],
        "total": balance["total"],
        "withdrawable": balance["withdrawable"],
        "bonus": balance["bonus"],
    }


@router.get("/credits/history")
def credit_history(current_user: dict = Depends(get_current_user)):
    return [t.model_dump() for t in credit_store.get_history(current_user["sub"])]


@router.post("/credits/reward")
def reward_credits(data: dict, current_user: dict = Depends(require_admin)):
    user_id = data["user_id"]
    amount = data["amount"]
    tx_type = data.get("type", "manual_topup")
    note = data.get("note", "")
    ref_id = data.get("ref_id", "")
    withdrawable = data.get("withdrawable", True)

    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")

    tx = credit_store.add_credits(
        user_id, amount, tx_type, ref_id, note, withdrawable=withdrawable)
    return tx.model_dump()


# ═══════════════════════════════════════════
# Withdrawal
# ═══════════════════════════════════════════

@router.post("/credits/withdraw")
def request_withdrawal(data: dict, current_user: dict = Depends(get_current_user)):
    amount = data.get("amount", 0)
    payment_method = data.get("payment_method", "")
    payment_account = data.get("payment_account", "")

    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if not payment_account.strip():
        raise HTTPException(400, "Payment account is required (PayPal email / bank account)")
    if not payment_method:
        raise HTTPException(400, "Payment method is required")

    # Only withdrawable balance can be withdrawn
    withdrawable = credit_store.get_withdrawable(current_user["sub"])
    if withdrawable < amount:
        raise HTTPException(400, f"Insufficient withdrawable balance. You have {withdrawable} withdrawable pts.")

    # Deduct from withdrawable balance
    tx = credit_store.deduct_credits(
        current_user["sub"], amount, "withdrawal",
        note=f"Withdrawal request: {payment_method} → {payment_account}",
        prefer_withdrawable=True)
    if not tx:
        raise HTTPException(500, "Deduction failed")

    # Create withdrawal request
    wr = WithdrawalRequest(
        user_id=current_user["sub"],
        amount=amount,
        payment_method=payment_method,
        payment_account=payment_account,
    )
    withdrawal_store.create(wr)
    return {"withdrawal": wr.model_dump(), "balance": credit_store.get_balance(current_user["sub"])}


@router.get("/credits/withdrawals")
def my_withdrawals(current_user: dict = Depends(get_current_user)):
    return [w.model_dump() for w in withdrawal_store.get_by_user(current_user["sub"])]
