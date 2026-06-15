"""KOC 裂变推荐路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Referral
from stores.referral_store import referral_store
from stores.koc_store import koc_store
from stores.user_store import user_store
from auth import get_current_user
import random
import string

router = APIRouter(tags=["referrals"])


def _gen_ref_code(handle: str) -> str:
    prefix = "".join(c.upper() for c in handle if c.isalnum())[:4]
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{suffix}"


@router.get("/referrals/code")
def get_my_referral_code(current_user: dict = Depends(get_current_user)):
    """KOC 获取自己的推荐码/链接"""
    if current_user.get("role") != "koc":
        raise HTTPException(403, "Only KOC can have referral codes")

    # 查已有
    existing = [r for r in referral_store.list_by_referrer(current_user["sub"])]
    if existing:
        code = existing[0].referral_code
    else:
        # 生成新的
        user = user_store.get_by_id(current_user["sub"])
        code = _gen_ref_code(user.email.split("@")[0] if user else "KOC")
        ref = Referral(
            referrer_koc_id=current_user["sub"],
            referral_code=code,
        )
        referral_store.create(ref)

    return {"referral_code": code, "referral_link": f"/apply?ref={code}"}


@router.get("/referrals")
def list_my_referrals(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can view referrals")
    refs = referral_store.list_by_referrer(current_user["sub"] if current_user.get("role") == "koc" else None)
    return [r.model_dump() for r in refs]


@router.get("/referrals/stats")
def referral_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "koc":
        raise HTTPException(403, "Only KOC")
    refs = referral_store.list_by_referrer(current_user["sub"])
    total = len(refs)
    joined = len([r for r in refs if r.status == "joined"])
    completed = len([r for r in refs if r.status == "completed"])
    total_reward = sum(r.reward_credits for r in refs if r.status == "completed")
    return {
        "total_invites": total,
        "joined": joined,
        "completed": completed,
        "total_reward_credits": total_reward,
    }
