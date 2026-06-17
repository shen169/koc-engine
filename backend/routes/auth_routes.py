"""认证路由"""

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from models import User, UserRegister, UserLogin
from stores.user_store import user_store
from stores.credit_store import credit_store
from auth import create_token, get_current_user
from config import DEFAULT_INITIAL_CREDITS

router = APIRouter(tags=["auth"])


@router.post("/auth/register")
def register(data: UserRegister):
    if data.role not in ("koc", "merchant"):
        raise HTTPException(400, "role must be koc or merchant")
    existing = user_store.get_by_email(data.email)
    if existing:
        raise HTTPException(400, "Email already registered")

    user = User(
        email=data.email,
        password_hash=bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode(),
        role=data.role,
    )
    user_store.create(user)

    # KOC 注册给初始点数
    if data.role == "koc":
        credit_store.set_initial_balance(user.id, DEFAULT_INITIAL_CREDITS)

    token = create_token(user.id, user.email, user.role)
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.post("/auth/login")
def login(data: UserLogin):
    user = user_store.get_by_email(data.email)
    if not user:
        raise HTTPException(401, "Invalid email or password")
    if not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user.id, user.email, user.role)
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.get("/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    user = user_store.get_by_id(current_user["sub"])
    if not user:
        raise HTTPException(404, "User not found")
    balance = credit_store.get_balance(user.id)

    # 补全 KOC/Merchant profile id + 信任分/等级
    profile_id = ""
    koc_trust = None
    merchant_trust = None
    if user.role == "koc":
        from stores.koc_store import koc_store as ks
        koc = ks.get_by_email(user.email)
        if koc:
            profile_id = koc.id
            koc_trust = {
                "trust_score": koc.trust_score,
                "tier": koc.tier,
                "completed_tasks": koc.completed_tasks,
                "avg_rating": koc.avg_rating,
            }
    elif user.role == "merchant":
        from stores.merchant_store import merchant_store as ms
        m = ms.get_by_user_id(user.id)
        if m:
            profile_id = m.id
            merchant_trust = {
                "trust_score": m.trust_score,
                "tier": m.tier,
                "total_tasks_completed": m.total_tasks_completed,
                "total_tasks_disputed": m.total_tasks_disputed,
                "avg_rating": m.avg_rating,
            }

    result = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "credits_balance": balance,
        "profile_id": profile_id,
    }
    if koc_trust:
        result["koc_profile"] = koc_trust
    if merchant_trust:
        result["merchant_profile"] = merchant_trust
    return result
