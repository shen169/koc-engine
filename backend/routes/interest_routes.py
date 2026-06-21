"""意向表达 + 匹配路由 — V2：KOC 感兴趣 → 自动接单"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from models import Interest, KocTask
from stores.interest_store import interest_store
from stores.merchant_store import merchant_store
from stores.koc_store import koc_store
from stores.user_store import user_store
from stores.task_store import task_store
from stores.product_store import product_store
from stores.credit_store import credit_store
from auth import get_current_user, require_admin
from config import PLATFORM_SERVICE_FEE
from routes.task_routes import _sync_task_status

import re

router = APIRouter(tags=["interests"])


def _parse_commission(value: str) -> int:
    """从 commission_value 字符串中提取数值。支持格式：'15% off', '$20', '10', '15%'。失败返回 30。"""
    if not value:
        return 30
    # 尝试直接整数解析
    if value.strip().isdigit():
        return max(1, int(value.strip()))
    # 提取第一个数字
    m = re.search(r'(\d+)', value)
    if m:
        return max(1, int(m.group(1)))
    return 30


def _make_slot(koc_id: str, status: str = "accepted") -> dict:
    """创建标准 KOC slot"""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "koc_id": koc_id,
        "status": status,
        "assigned_at": now,
        "accepted_at": now if status == "accepted" else "",
        "shipped_at": "",
        "received_at": "",
        "submitted_at": "",
        "tracking_number": "",
        "content_urls": [],
        "content_data": {},
        "pledge_paid": False,
        "merchant_pledge_returned": False,
        "commission_paid": False,
        "reject_count": 0,
        "match_score": 0,
    }


def _get_koc_user_id(koc_profile_id: str) -> str:
    koc = koc_store.get(koc_profile_id)
    if koc and koc.email:
        user = user_store.get_by_email(koc.email)
        if user:
            return user.id
    return koc_profile_id


def _get_merchant_user_id(merchant_id: str) -> str:
    merchant = merchant_store.get(merchant_id)
    return merchant.user_id if merchant else merchant_id


def auto_assign_koc_to_product(koc_id: str, product_id: str) -> dict | None:
    """共享自动接单逻辑：KOC 对产品有意向 → 查找空位/创建任务。

    被 interest_routes.express_interest 和 matching_routes.auto_express_interest 共用。

    Returns: {task_id, slot_index, action: 'filled'|'created'} 或 None
    """
    product = product_store.get(product_id)
    if not product:
        return None

    # 查找该产品已有任务中的空位
    existing_tasks = task_store.list_all({"product_id": product_id})
    for t in existing_tasks:
        if t.task_status in ("completed", "disputed"):
            continue
        # 检查该 KOC 是否已在此任务中有 slot（防重复占用）
        if any(s.get("koc_id") == koc_id for s in t.koc_slots if s.get("koc_id")):
            continue
        for i, slot in enumerate(t.koc_slots):
            if not slot.get("koc_id"):
                koc_uid = _get_koc_user_id(koc_id)
                if t.pledge_koc > 0:
                    pledge_result = credit_store.deduct_credits(
                        koc_uid, t.pledge_koc, "pledge_koc",
                        t.id, f"Pledge for task: {t.product_name}"
                    )
                    if pledge_result is None:
                        raise HTTPException(400, f"Insufficient credits for KOC pledge ({t.pledge_koc} pt)")

                # 填入已有空位
                new_slot = _make_slot(koc_id)
                new_slot["pledge_paid"] = t.pledge_koc > 0
                task_store.update_slot(t.id, i, new_slot)
                _sync_task_status(t.id)
                return {"task_id": t.id, "slot_index": i, "action": "filled"}

    # 无可用空位 → 自动创建 long_term 任务（含质押）
    now = datetime.now(timezone.utc).isoformat()
    parsed_commission = _parse_commission(product.commission_value or "")
    task = KocTask(
        merchant_id=product.merchant_id,
        product_id=product_id,
        product_name=product.name,
        product_asin=product.asin,
        task_type="long_term",
        task_status="accepted",
        koc_required=1,
        koc_slots=[_make_slot(koc_id)],
        pledge_merchant=parsed_commission,   # 商家质押 = 佣金值
        pledge_koc=parsed_commission,        # KOC 质押 = 佣金值
        commission=parsed_commission,
        created_at=now,
    )

    merchant_uid = _get_merchant_user_id(product.merchant_id)
    koc_uid = _get_koc_user_id(koc_id)

    fee_result = credit_store.deduct_credits(
        merchant_uid, PLATFORM_SERVICE_FEE, "platform_fee",
        task.id, f"Platform service fee for auto-created task: {task.product_name}"
    )
    if fee_result is None:
        raise HTTPException(400, f"Merchant has insufficient credits for platform fee ({PLATFORM_SERVICE_FEE} pt)")

    merchant_pledge_result = credit_store.deduct_credits(
        merchant_uid, task.pledge_merchant, "pledge_merchant",
        task.id, f"Merchant pledge for auto-created task: {task.product_name}"
    )
    if merchant_pledge_result is None:
        credit_store.add_credits(
            merchant_uid, PLATFORM_SERVICE_FEE, "pledge_fee_rollback",
            task.id, "Rollback: auto-created task merchant pledge failed"
        )
        raise HTTPException(400, f"Merchant has insufficient credits for pledge ({task.pledge_merchant} pt)")

    koc_pledge_result = credit_store.deduct_credits(
        koc_uid, task.pledge_koc, "pledge_koc",
        task.id, f"Pledge for auto-created task: {task.product_name}"
    )
    if koc_pledge_result is None:
        credit_store.add_credits(
            merchant_uid, PLATFORM_SERVICE_FEE, "pledge_fee_rollback",
            task.id, "Rollback: auto-created task KOC pledge failed"
        )
        credit_store.add_credits(
            merchant_uid, task.pledge_merchant, "pledge_merchant_rollback",
            task.id, "Rollback: auto-created task KOC pledge failed"
        )
        raise HTTPException(400, f"Insufficient credits for KOC pledge ({task.pledge_koc} pt)")

    task.koc_slots[0]["pledge_paid"] = task.pledge_koc > 0
    task_store.create(task)
    return {"task_id": task.id, "slot_index": 0, "action": "created"}


@router.post("/interests")
def express_interest(data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 对产品 / 商家对 KOC 表达意向。
    KOC 对产品表达意向 → 自动接单（创建任务 or 填入空位），不再等待商家审核。"""
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

        # 每个 KOC 最多 5 个进行中任务
        active_count = task_store.count_active_for_koc(from_id)
        if active_count >= 5:
            raise HTTPException(400, f"You already have {active_count} active tasks (max 5). Complete some first.")
    elif role == "merchant":
        if to_type != "koc":
            raise HTTPException(400, "Merchant can only express interest in KOCs")
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            raise HTTPException(404, "Create merchant profile first")
        from_id = m.id
    else:
        raise HTTPException(403, "Only KOC and merchant can express interest")

    # 检查是否已表达过意向
    existing = interest_store.get_by_ids(from_id, to_id, role)
    if existing:
        # 返回已有记录（可能已附带 task 信息）
        result = existing.model_dump()
        if role == "koc":
            # 查找已有任务中的 slot
            for t in task_store.list_all({"product_id": to_id}):
                for si, slot in enumerate(t.koc_slots):
                    if slot.get("koc_id") == from_id:
                        result["task_id"] = t.id
                        result["slot_index"] = si
                        result["auto_assigned"] = True
                        break
        return result

    assign_result = None
    if role == "koc" and to_type == "product":
        assign_result = auto_assign_koc_to_product(from_id, to_id)

    # 创建意向记录
    interest = Interest(
        from_role=role,
        from_id=from_id,
        to_id=to_id,
        to_type=to_type,
    )
    interest_store.create(interest)
    result = interest.model_dump()

    if assign_result:
        result["task_id"] = assign_result["task_id"]
        result["slot_index"] = assign_result["slot_index"]
        result["auto_assigned"] = True

    return result


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
