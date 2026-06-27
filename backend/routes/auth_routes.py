"""认证路由"""

import re
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from models import User, UserRegister, UserLogin
from stores.user_store import user_store
from stores.credit_store import credit_store
from auth import create_token, get_current_user
from config import DEFAULT_KOC_INITIAL_CREDITS, DEFAULT_MERCHANT_INITIAL_CREDITS, KOC_REGISTRATION_IP_LIMIT, MERCHANT_REGISTRATION_IP_LIMIT

router = APIRouter(tags=["auth"])

# ── 输入校验 ──

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")
_MIN_PASSWORD_LENGTH = 8

def _validate_email(email: str):
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email format")
    if len(email) > 254:
        raise HTTPException(400, "Email too long")

def _validate_password(password: str):
    if not password or len(password) < _MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {_MIN_PASSWORD_LENGTH} characters")
    if len(password) > 128:
        raise HTTPException(400, "Password too long")


@router.post("/auth/register")
def register(data: UserRegister, request: Request = None):
    _validate_email(data.email)
    _validate_password(data.password)
    if data.role not in ("koc", "merchant"):
        raise HTTPException(400, "role must be koc or merchant")
    existing = user_store.get_by_email(data.email)
    if existing:
        raise HTTPException(400, f"This email is already registered as {existing.role}. Please log in instead.")

    # IP 检测：防止同 IP 注册双角色
    client_ip = ""
    if request:
        client_ip = request.client.host if request.client else ""
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

    if client_ip:
        same_ip_users = user_store.get_by_ip(client_ip)
        for u in same_ip_users:
            if u.role != data.role:
                raise HTTPException(403, f"This IP has already registered as {u.role}. Cannot register as {data.role}.")

        # IP 频率限制：KOC 注册同 IP 最多 2 个/7 天
        if data.role == "koc":
            recent_koc_count = user_store.count_recent_koc_by_ip(client_ip)
            if recent_koc_count >= KOC_REGISTRATION_IP_LIMIT:
                raise HTTPException(
                    429,
                    f"Too many KOC registrations from this IP in the past 7 days "
                    f"({recent_koc_count}/{KOC_REGISTRATION_IP_LIMIT} limit). "
                    f"Each creator must use their own social account."
                )

        # IP 限制：商家注册同 IP 最多 1 个
        if data.role == "merchant":
            merchant_count = user_store.count_merchant_by_ip(client_ip)
            if merchant_count >= MERCHANT_REGISTRATION_IP_LIMIT:
                raise HTTPException(
                    429,
                    f"Only one merchant account allowed per IP. "
                    f"This IP has already registered {merchant_count} merchant account(s)."
                )

    user = User(
        email=data.email,
        password_hash=bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode(),
        role=data.role,
        registration_ip=client_ip,
    )
    user_store.create(user)

    # KOC 注册给 200 点，商家注册给 100 点
    if data.role == "koc":
        credit_store.set_initial_balance(user.id, DEFAULT_KOC_INITIAL_CREDITS)
    elif data.role == "merchant":
        credit_store.set_initial_balance(user.id, DEFAULT_MERCHANT_INITIAL_CREDITS)

    token = create_token(user.id, user.email, user.role)
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.post("/auth/login")
def login(data: UserLogin):
    _validate_email(data.email)
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
                "region": koc.region,
                "niche_tags": koc.niche_tags,
                # Full profile fields for edit form pre-fill
                "display_name": koc.display_name,
                "platform": koc.platform,
                "handle": koc.handle,
                "profile_url": koc.profile_url,
                "follower_count": koc.follower_count,
                "shipping_address": getattr(koc, "shipping_address", ""),
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
                # Full profile fields for edit form pre-fill
                "company_name": m.company_name,
                "website": m.website,
                "amazon_storefront": m.amazon_storefront,
                "product_categories": m.product_categories,
                "target_markets": m.target_markets,
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
