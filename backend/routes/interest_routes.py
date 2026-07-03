"""意向表达 + 匹配路由 — V2：KOC 感兴趣 → 自动接单"""

from datetime import datetime, timezone
from services.notifier import notify_user
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
from config import KOC_PLEDGE_SAMPLE, PLATFORM_SERVICE_FEE, TIER_COMMISSION_MAX, TIER_MAX_ACTIVE_SLOTS, NotifType
from routes.task_routes import _sync_task_status

router = APIRouter(tags=["interests"])


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
        "reviewed_at": "",
        "tracking_number": "",
        "carrier": "",
        "shipping_proof_urls": [],
        "receipt_photo_urls": [],
        "receipt_notes": "",
        "content_urls": [],
        "content_data": {},
        "pledge_paid": False,
        "commission_paid": False,
        "reject_count": 0,
        "revision_count": 0,
        "review_feedback": "",
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
                
                # Notification: KOC matched to product
                koc_user = _get_koc_user_id(koc_id)
                if koc_user:
                    m = merchant_store.get(t.merchant_id)
                    merchant_name = m.company_name if m else "Brand"
                    notify_user(
                        koc_user,
                        NotifType.KOC_MATCHED,
                        task_id=t.id,
                        resource_path=f"/portal/tasks/{t.id}",
                        product_name=t.product_name,
                        company_name=merchant_name,
                        pledge_koc=t.pledge_koc,
                        commission=getattr(t, 'koc_commission', 30),
                    )
                
                return {"task_id": t.id, "slot_index": i, "action": "filled"}

    # 无可用空位 → 自动创建 long_term 任务（V2.6: 默认样品模式，打怪升级）
    now = datetime.now(timezone.utc).isoformat()
    # V2.6: 意向自动创建的任务默认 sample 模式（新连接从样品开始）
    is_sample = True  # auto-created tasks are sample by default
    task_commission = 0 if is_sample else 30
    task_pledge_koc = KOC_PLEDGE_SAMPLE if is_sample else task_commission
    task_pledge_merchant = 0 if is_sample else 30  # commission pool (0 for sample)

    task = KocTask(
        merchant_id=product.merchant_id,
        product_id=product_id,
        product_name=product.name,
        product_asin=product.asin,
        task_type="long_term",
        task_status="accepted",
        task_mode="sample" if is_sample else "commission",
        koc_required=1,
        koc_slots=[_make_slot(koc_id)],
        pledge_merchant=task_pledge_merchant,
        pledge_koc=task_pledge_koc,
        commission=task_commission,
        created_at=now,
    )

    merchant_uid = _get_merchant_user_id(product.merchant_id)
    koc_uid = _get_koc_user_id(koc_id)

    # 平台服务费
    fee_result = credit_store.deduct_credits(
        merchant_uid, PLATFORM_SERVICE_FEE, "platform_fee",
        task.id, f"Platform service fee for auto-created task: {task.product_name}"
    )
    if fee_result is None:
        raise HTTPException(400, f"Merchant has insufficient credits for platform fee ({PLATFORM_SERVICE_FEE} pt)")

    # 商家佣金池（sample 模式为 0，跳过）
    if task_pledge_merchant > 0:
        merchant_pledge_result = credit_store.deduct_credits(
            merchant_uid, task.pledge_merchant, "pledge_merchant",
            task.id, f"Merchant pledge for auto-created task: {task.product_name}"
        )
        if merchant_pledge_result is None:
            credit_store.add_credits(
                merchant_uid, PLATFORM_SERVICE_FEE, "platform_fee_rollback",
                task.id, "Rollback: auto-created task merchant pledge failed"
            )
            raise HTTPException(400, f"Merchant has insufficient credits for pledge ({task.pledge_merchant} pt)")

    # KOC 质押
    koc_pledge_result = credit_store.deduct_credits(
        koc_uid, task.pledge_koc, "pledge_koc",
        task.id, f"Pledge for auto-created task: {task.product_name}"
    )
    if koc_pledge_result is None:
        # 回滚
        credit_store.add_credits(
            merchant_uid, PLATFORM_SERVICE_FEE, "platform_fee_rollback",
            task.id, "Rollback: auto-created task KOC pledge failed"
        )
        if task_pledge_merchant > 0:
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

        # V2.6: 等级门禁 — 每个 KOC 并行任务上限
        max_slots = TIER_MAX_ACTIVE_SLOTS.get(koc.tier, 2)
        active_count = task_store.count_active_for_koc(from_id)
        if active_count >= max_slots:
            raise HTTPException(400,
                f"🔒 Tier {koc.tier}: Max {max_slots} active tasks. "
                f"You have {active_count}. Complete some or upgrade to accept more.")
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

    # 创建意向记录 FIRST — before any credit deductions or task creation
    # (ensures the intent is recorded even if downstream assignment fails)
    interest = Interest(
        from_role=role,
        from_id=from_id,
        to_id=to_id,
        to_type=to_type,
    )
    interest_store.create(interest)

    assign_result = None
    if role == "koc" and to_type == "product":
        try:
            assign_result = auto_assign_koc_to_product(from_id, to_id)
        except HTTPException:
            # Auto-assignment failed — clean up the orphaned interest record
            interest_store.delete(interest.id)
            raise

    # Notification: KOC expressed interest → notify merchant
    if role == "koc" and to_type == "product":
        from stores.product_store import product_store
        product = product_store.get(to_id)
        if product:
            m = merchant_store.get(product.merchant_id)
            if m:
                merchant_usr = user_store.get_by_id(m.user_id)
                if merchant_usr:
                    notify_user(
                        merchant_usr.id,
                        NotifType.INTEREST_RECEIVED,
                        task_id=assign_result.get("task_id", "") if assign_result else "",
                        resource_path=f"/dashboard/products/{to_id}",
                        product_name=product.name,
                        platform=data.get("platform", "social media"),
                    )

        # Notification: KOC → also confirm interest has been registered
        if current_user.get("role") == "koc":
            notify_user(
                current_user["sub"],
                NotifType.INTEREST_RECEIVED,
                task_id=assign_result.get("task_id", "") if assign_result else "",
                resource_path=f"/portal/products/{to_id}",
                product_name=product.name,
            )

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
