"""Credit system routes"""

from fastapi import APIRouter, Depends, HTTPException
from stores.credit_store import credit_store
from stores.withdrawal_store import withdrawal_store
from models import WithdrawalRequest
from auth import get_current_user, require_admin
from stores.user_store import user_store
from config import KOC_WITHDRAWAL_MIN_COMPLETIONS, KOC_WITHDRAWAL_MIN_BALANCE, KOC_WITHDRAWAL_DAILY_MAX

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

    # 商家奖励强制 bonus（不可提现）
    target_user = user_store.get_by_id(user_id)
    if target_user and target_user.role == "merchant" and withdrawable:
        withdrawable = False

    tx = credit_store.add_credits(
        user_id, amount, tx_type, ref_id, note, withdrawable=withdrawable)
    return tx.model_dump()


# ═══════════════════════════════════════════
# Withdrawal
# ═══════════════════════════════════════════

@router.post("/credits/withdraw")
def request_withdrawal(data: dict, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "")
    user_id = current_user["sub"]

    # ── 商家禁止提现 ──
    if role == "merchant":
        raise HTTPException(403, "Merchants cannot withdraw. Points are for publishing tasks only.")

    # ── Admin 无限制（测试用）──
    if role == "admin":
        pass
    elif role == "koc":
        # ── KOC 提现门槛 1：完成 ≥3 单 ──
        from stores.koc_store import koc_store
        user = user_store.get_by_id(user_id)
        koc = koc_store.get_by_email(user.email) if user else None
        if not koc:
            raise HTTPException(404, "KOC profile not found")
        if koc.completed_tasks < KOC_WITHDRAWAL_MIN_COMPLETIONS:
            raise HTTPException(
                403,
                f"Withdrawal locked: complete at least {KOC_WITHDRAWAL_MIN_COMPLETIONS} tasks "
                f"(you have {koc.completed_tasks})."
            )
        # ── KOC 提现门槛 2：withdrawable 余额 ≥100pt ──
        withdrawable_balance = credit_store.get_withdrawable(user_id)
        if withdrawable_balance < KOC_WITHDRAWAL_MIN_BALANCE:
            raise HTTPException(
                403,
                f"Withdrawal locked: accumulate at least {KOC_WITHDRAWAL_MIN_BALANCE}pt withdrawable "
                f"(you have {withdrawable_balance}pt)."
            )
        # ── KOC 提现日上限 500pt ──
        daily_total = withdrawal_store.get_daily_total(user_id)
        amount = data.get("amount", 0)
        if daily_total + amount > KOC_WITHDRAWAL_DAILY_MAX:
            raise HTTPException(
                403,
                f"Daily withdrawal limit reached: {daily_total}/{KOC_WITHDRAWAL_DAILY_MAX}pt today. "
                f"Try again tomorrow or contact admin."
            )

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
    withdrawable = credit_store.get_withdrawable(user_id)
    if withdrawable < amount:
        raise HTTPException(400, f"Insufficient withdrawable balance. You have {withdrawable} withdrawable pts.")

    # Deduct from withdrawable balance
    tx = credit_store.deduct_credits(
        user_id, amount, "withdrawal",
        note=f"Withdrawal request: {payment_method} → {payment_account}",
        prefer_withdrawable=True)
    if not tx:
        raise HTTPException(500, "Deduction failed")

    # Create withdrawal request
    wr = WithdrawalRequest(
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        payment_account=payment_account,
    )
    withdrawal_store.create(wr)
    return {"withdrawal": wr.model_dump(), "balance": credit_store.get_balance(user_id)}


@router.get("/credits/withdrawals")
def my_withdrawals(current_user: dict = Depends(get_current_user)):
    return [w.model_dump() for w in withdrawal_store.get_by_user(current_user["sub"])]
