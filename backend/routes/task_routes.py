"""任务/履约路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import KocTask
from stores.task_store import task_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from stores.user_store import user_store
from stores.credit_store import credit_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["tasks"])

def _get_koc_user_id(koc_profile_id: str) -> str:
    """通过 KOC profile email 找到对应 user id"""
    koc = koc_store.get(koc_profile_id)
    if koc and koc.email:
        user = user_store.get_by_email(koc.email)
        if user:
            return user.id
    return koc_profile_id  # fallback


@router.post("/tasks")
def create_task(data: dict, current_user: dict = Depends(require_admin)):
    task = KocTask(
        koc_id=data["koc_id"],
        merchant_id=data.get("merchant_id", ""),
        product_id=data.get("product_id", ""),
        product_asin=data.get("product_asin", ""),
        product_name=data.get("product_name", ""),
        due_at=data.get("due_at", ""),
        credits_reward=data.get("credits_reward", 30),
        deposit_amount_usd=data.get("deposit_amount_usd", 0.0),
    )
    task_store.create(task)

    # 更新 KOC 状态
    koc_store.update(data["koc_id"], {"status": "SampleSent"})

    return task.model_dump()


@router.get("/tasks")
def list_tasks(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role == "koc":
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        tasks = task_store.list_by_koc(koc.id) if koc else []
    elif role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        tasks = task_store.list_by_merchant(m.id) if m else []
    elif role == "admin":
        tasks = task_store.list_all()
    else:
        tasks = []
    return [t.model_dump() for t in tasks]


@router.get("/tasks/{task_id}")
def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task.model_dump()


@router.put("/tasks/{task_id}/submit")
def submit_task(task_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 回传视频链接"""
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    # KOC user_id ≠ koc_profile_id — 用 email 验证归属
    koc_uid = _get_koc_user_id(task.koc_id)
    if current_user.get("role") != "admin" and current_user.get("sub") != koc_uid:
        raise HTTPException(403, "Not your task")

    submit_url = data.get("submit_url", "")
    updated = task_store.update(task_id, {"submit_url": submit_url})
    koc_store.update(task.koc_id, {"status": "Submitted"})
    return updated.model_dump()


@router.put("/tasks/{task_id}/confirm")
def confirm_task(task_id: str, current_user: dict = Depends(require_admin)):
    """Admin 确认履约 → Delivered + 自动发点数"""
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.credits_rewarded:
        raise HTTPException(400, "Credits already rewarded")

    task_store.update(task_id, {"delivered": True})

    # 自动发点数（发到 KOC 的 user 账户，不是 profile）
    if task.credits_reward > 0:
        koc_uid = _get_koc_user_id(task.koc_id)
        credit_store.add_credits(
            koc_uid,
            task.credits_reward,
            "task_reward",
            task_id,
            f"Task completion reward"
        )
        task_store.update(task_id, {"credits_rewarded": True})

    # 更新 KOC 状态 + 统计
    koc_store.update(task.koc_id, {
        "status": "Delivered",
        "completed_tasks": (koc_store.get(task.koc_id).completed_tasks + 1),
        "total_collaborations": (koc_store.get(task.koc_id).total_collaborations + 1),
    })

    return {"status": "Delivered", "credits_rewarded": task.credits_reward}


@router.put("/tasks/{task_id}/sample")
def update_sample_status(task_id: str, data: dict, current_user: dict = Depends(require_admin)):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    sample_status = data.get("sample_status", "sent")
    updated = task_store.update(task_id, {"sample_status": sample_status})
    if sample_status == "sent":
        koc_store.update(task.koc_id, {"status": "SampleSent"})
    return updated.model_dump()
