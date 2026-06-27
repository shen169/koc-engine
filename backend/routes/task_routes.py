"""任务/履约路由 V2 — 批量 KOC + 质押 + 全状态机"""

from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query
from models import KocTask
from stores.task_store import task_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from stores.user_store import user_store
from stores.credit_store import credit_store
from stores.product_store import product_store
from services.matcher import match_kocs_for_task, rematch_slot
from services.cron import sync_koc_tier, sync_merchant_tier
from auth import get_current_user, require_admin
from config import PLATFORM_SERVICE_FEE, KOC_PLATFORM_FEE_RATE, KOC_PLATFORM_FEE_MIN, KOC_FIXED_PLEDGE, KOC_PLEDGE_SAMPLE, TASK_COMMISSION_MIN, TASK_COMMISSION_MAX, MAX_REVISIONS, NotifType
from models import ContentMetrics
from services.notifier import notify_user
from services.content_judge import judge_submission

router = APIRouter(tags=["tasks"])


def _get_koc_user_id(koc_profile_id: str) -> str:
    """通过 KOC profile email 找到对应 user id"""
    koc = koc_store.get(koc_profile_id)
    if koc and koc.email:
        user = user_store.get_by_email(koc.email)
        if user:
            return user.id
    return koc_profile_id


def _get_merchant_user_id(merchant_id: str) -> str:
    """通过 merchant id 找到 user id"""
    m = merchant_store.get(merchant_id)
    return m.user_id if m else merchant_id


def _get_current_koc_profile_id(current_user: dict) -> str:
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    return koc.id if koc else current_user["sub"]


def _ensure_can_view_task(task: KocTask, current_user: dict):
    role = current_user.get("role")
    if role == "admin":
        return
    if role == "merchant":
        merchant = merchant_store.get_by_user_id(current_user["sub"])
        if merchant and merchant.id == task.merchant_id:
            return
    if role == "koc":
        koc_id = _get_current_koc_profile_id(current_user)
        if any(slot.get("koc_id") == koc_id for slot in task.koc_slots):
            return
    raise HTTPException(403, "Not allowed to view this task")


# ═══════════════════════════════════════════
# 商家发布任务
# ═══════════════════════════════════════════

@router.post("/tasks")
def create_task(data: dict, current_user: dict = Depends(get_current_user)):
    """商家发布任务。加急任务自动触发匹配引擎。"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchant can create tasks")

    # 获取商家档案
    if current_user.get("role") == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            raise HTTPException(404, "Create merchant profile first")
        merchant_id = m.id

        # 诚信度检查
        if m.trust_score < 40:
            raise HTTPException(403, f"Trust score too low ({m.trust_score}/100). Can't create new tasks.")
    else:
        merchant_id = data.get("merchant_id", "")

    task_type = data.get("task_type", "long_term")
    koc_required = data.get("koc_required", 1)
    commission = data.get("commission", 30)

    # ── 任务模式判断 ──
    task_mode = data.get("task_mode", "commission")  # "commission" | "sample"
    if task_mode == "sample":
        commission = 0  # 寄样模式：无佣金，KOC 只拿免费产品
    elif not (TASK_COMMISSION_MIN <= commission <= TASK_COMMISSION_MAX):
        raise HTTPException(400, f"Commission must be between {TASK_COMMISSION_MIN}-{TASK_COMMISSION_MAX}pt "
                                 f"(or use task_mode='sample' for product-only collaboration)")

    # 验证产品归属（product_id 必须属于该商家或 admin）
    product_id = data.get("product_id", "")
    if product_id and current_user.get("role") == "merchant":
        product = product_store.get(product_id)
        if not product:
            raise HTTPException(404, f"Product not found: {product_id}")
        if product.merchant_id != merchant_id:
            raise HTTPException(403, "Product does not belong to your merchant account")

    # ── 质押规则 ──
    pledge_merchant = commission * koc_required      # 商家佣金池（寄样模式=0，不退，发布时一次扣完）
    pledge_koc = KOC_PLEDGE_SAMPLE if task_mode == "sample" else KOC_FIXED_PLEDGE

    task = KocTask(
        merchant_id=merchant_id,
        product_id=data.get("product_id", ""),
        product_asin=data.get("product_asin", ""),
        product_name=data.get("product_name", ""),
        task_type=task_type,
        task_status="pending",
        koc_required=koc_required,
        koc_slots=[],  # 初始化为空，后续匹配引擎填充
        task_mode=task_mode,
        pledge_merchant=pledge_merchant,
        pledge_koc=pledge_koc,
        commission=commission,
        due_at=data.get("due_at", ""),
    )
    task_store.create(task)

    # ── 平台服务费 + 商家佣金池：建任务时立即扣除 ──
    m_uid = _get_merchant_user_id(merchant_id)

    # 1️⃣ 平台服务费 5pt（不退还）
    fee_result = credit_store.deduct_credits(
        m_uid, PLATFORM_SERVICE_FEE, "platform_fee",
        task.id, f"Platform service fee for task: {task.product_name}"
    )
    if fee_result is None:
        raise HTTPException(400, f"Insufficient credits for platform fee ({PLATFORM_SERVICE_FEE} pts)")

    # 2️⃣ 商家佣金池 commission × KOC人数（不退，完成时转给 KOC）
    if pledge_merchant > 0:
        pledge_result = credit_store.deduct_credits(
            m_uid, pledge_merchant, "commission_pool",
            task.id, f"Commission pool for task: {task.product_name} ({koc_required} slots × {commission}pt)"
        )
        if pledge_result is None:
            # 回退平台费
            credit_store.add_credits(m_uid, PLATFORM_SERVICE_FEE, "platform_fee_rollback", task.id, "Rollback: commission pool deduction failed")
            raise HTTPException(400, f"Insufficient credits for commission pool ({pledge_merchant} pts for {koc_required} slots × {commission}pt)")

    # 自动匹配引擎：加急任务预填 slot，长线任务留空由 KOC 广场自主接单
    matched = []
    if task_type == "urgent":
        results = match_kocs_for_task(task, count=koc_required, buffer=3)
        if results:
            slots = []
            for r in results:
                slots.append({
                    "koc_id": r["koc_id"],
                    "status": "assigned",
                    "assigned_at": datetime.utcnow().isoformat(),
                    "accepted_at": "",
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
                    "match_score": r["score"],
                    # ── 内容抓取验证 ──
                    "scraped_status": "",
                    "scraped_data": {},
                    "scraped_run_id": "",
                    "scrape_attempts": 0,
                })
            task_store.update(task.id, {"koc_slots": slots, "task_status": "assigned"})
            matched = [{"koc_id": s["koc_id"], "slot_index": i, "match_score": s["match_score"]}
                        for i, s in enumerate(slots)]
    else:
        # 长线任务：创建空 slot，KOC 在任务广场自主浏览接单
        slots = []
        for _ in range(koc_required):
            slots.append({
                "koc_id": "",
                "status": "assigned",
                "assigned_at": "",
                "accepted_at": "",
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
                # ── 内容抓取验证 ──
                "scraped_status": "",
                "scraped_data": {},
                "scraped_run_id": "",
                "verification_result": {},
            })
        # Persist empty slots to storage (they were created in-memory but never saved)
        task_store.update(task.id, {"koc_slots": slots})
        _sync_task_status(task.id)

    result = task_store.get(task.id).model_dump()
    result["matched_kocs"] = matched
    return result


# ═══════════════════════════════════════════
# 任务广场（KOC 视角）
# ═══════════════════════════════════════════

@router.get("/tasks/hall")
def list_task_hall(
    category: str = Query(""),
    task_type: str = Query(""),
    commission_min: int = Query(0),
    sort_by: str = Query("default"),
    region: str = Query(""),
    current_user: dict = Depends(get_current_user),
):
    """KOC 看到的任务广场"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can view task hall")

    # 获取 KOC 的 profile id
    koc_id = current_user["sub"]
    if current_user.get("role") == "koc":
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        koc_id = koc.id if koc else current_user["sub"]

    tasks = task_store.list_for_hall(
        koc_id=koc_id,
        category=category,
        task_type=task_type,
        commission_min=commission_min,
        sort_by=sort_by,
        region=region,
    )

    # 补全商家诚信度 + 返佣链接
    for t in tasks:
        m = merchant_store.get(t["merchant_id"])
        t["merchant_trust_score"] = m.trust_score if m else 100
        t["merchant_company"] = m.company_name if m else "Unknown"
        t["merchant_avg_rating"] = m.avg_rating if m else 0.0
        # 补全产品返佣链接
        if t.get("product_id"):
            product = product_store.get(t["product_id"])
            if product:
                t["commission_link"] = product.commission_link

    return tasks


# ═══════════════════════════════════════════
# 我的任务（KOC 视角）
# ═══════════════════════════════════════════

@router.get("/tasks/mine")
def list_my_tasks(current_user: dict = Depends(get_current_user)):
    """KOC 看到自己的任务列表（含进行中 + 历史）"""
    role = current_user.get("role")

    if role == "koc":
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        koc_id = koc.id if koc else current_user["sub"]
        active = task_store.get_koc_active_tasks(koc_id)
        all_tasks = task_store.list_by_koc(koc_id)

        # 提取每个任务里的 slot 信息
        result = []
        for t in all_tasks:
            for i, slot in enumerate(t.koc_slots):
                if slot.get("koc_id") == koc_id:
                    task_dict = t.model_dump()
                    # ── 补全产品信息 ──
                    if t.product_id:
                        product = product_store.get(t.product_id)
                        if product:
                            task_dict["product_category"] = product.category
                            task_dict["product_target_market"] = product.target_market
                            task_dict["product_commission_type"] = product.commission_type
                            task_dict["product_commission_value"] = product.commission_value
                            task_dict["product_commission_link"] = product.commission_link
                            task_dict["product_asin"] = product.asin
                            task_dict["product_url"] = f"https://amazon.com/dp/{product.asin}" if product.asin else ""
                            task_dict["product_description"] = (product.description or "")[:200]
                    # ── 补全商家信息 ──
                    if t.merchant_id:
                        merchant = merchant_store.get(t.merchant_id)
                        if merchant:
                            task_dict["merchant_company"] = merchant.company_name or "Brand"
                            task_dict["merchant_trust_score"] = merchant.trust_score
                            task_dict["merchant_tier"] = merchant.tier
                            task_dict["merchant_avg_rating"] = merchant.avg_rating
                    result.append({
                        "task": task_dict,
                        "my_slot_index": i,
                        "my_slot": slot,
                    })

        # 排序：进行中优先 → 加急优先 → 佣金高 → 商家等级高
        def _sort_key(item):
            slot = item["my_slot"]
            task = item["task"]
            is_active = 0 if slot.get("status") in ("completed", "submitted", "rejected", "timed_out") else 1
            is_urgent = 1 if task.get("task_type") == "urgent" else 0
            commission = task.get("commission", 0)
            merchant_tier_score = {"M3": 3, "M2": 2, "M1": 1}.get(task.get("merchant_tier", "M1"), 0)
            return (is_active, is_urgent, commission, merchant_tier_score)

        result.sort(key=_sort_key, reverse=True)
        return result

    elif role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m:
            return []
        tasks = task_store.list_by_merchant(m.id)
        return [t.model_dump() for t in tasks]

    elif role == "admin":
        tasks = task_store.list_all()
        return [t.model_dump() for t in tasks]

    return []


# ═══════════════════════════════════════════
# 获取单个任务
# ═══════════════════════════════════════════

@router.get("/tasks/{task_id}")
def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    _ensure_can_view_task(task, current_user)
    result = task.model_dump()
    # 补全产品信息
    if task.product_id:
        product = product_store.get(task.product_id)
        if product:
            result["product_category"] = product.category
            result["product_target_market"] = product.target_market
            result["product_description"] = product.description
            result["product_asin"] = product.asin
            result["commission_link"] = product.commission_link
            result["commission_type"] = product.commission_type
            result["commission_value"] = product.commission_value
    # 补全商家信息
    if task.merchant_id:
        merchant = merchant_store.get(task.merchant_id)
        if merchant:
            result["merchant_company"] = merchant.company_name or "Brand"
            result["merchant_trust_score"] = merchant.trust_score
            result["merchant_tier"] = merchant.tier
            result["merchant_avg_rating"] = merchant.avg_rating
    return result


# ═══════════════════════════════════════════
# KOC 接单
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/accept/{slot_index}")
def accept_task(task_id: str, slot_index: int, current_user: dict = Depends(get_current_user)):
    """KOC 接受任务 → 扣质押点"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can accept tasks")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    # 验证 KOC 身份
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]

    # 检查 slot 是否已分配且未接受
    if slot.get("status") != "assigned":
        raise HTTPException(400, f"Slot status is '{slot.get('status')}', not 'assigned'")

    # 检查是否为分配给该 KOC 或 KOC 主动接单（长线任务）
    slot_koc_id = slot.get("koc_id", "")
    if slot_koc_id and slot_koc_id != koc_id:
        raise HTTPException(403, "This slot is assigned to another KOC")

    # 防止同一个 KOC 接同一任务多个 slot
    for s in task.koc_slots:
        if s.get("koc_id") == koc_id and s.get("status") not in ("rejected", "timed_out"):
            raise HTTPException(400, "You already have a slot in this task")

    # 信任分检查（<30 不接单）
    if koc_profile := koc_store.get(koc_id):
        if koc_profile.trust_score < 30:
            raise HTTPException(403, f"Trust score too low ({koc_profile.trust_score}/100). Cannot accept tasks.")

    # 检查同时进行中任务数上限（最多 5 个 active slot）
    active_slots = 0
    for t in task_store.list_by_koc(koc_id):
        for s in t.koc_slots:
            if s.get("koc_id") == koc_id and s.get("status") in ("accepted", "shipped", "received", "creating"):
                active_slots += 1
    if active_slots >= 5:
        raise HTTPException(400, f"You already have {active_slots} active tasks (max 5). Complete some before accepting new ones.")

    koc_uid = _get_koc_user_id(koc_id)

    # 扣 KOC 质押点（平台费在完成时从质押中扣）
    if task.pledge_koc > 0:
        result = credit_store.deduct_credits(
            koc_uid, task.pledge_koc, "pledge_koc",
            task_id, f"Pledge for task: {task.product_name}"
        )
        if result is None:
            raise HTTPException(400, "Insufficient credits for pledge")

    # 更新 slot
    now = datetime.utcnow().isoformat()
    task_store.update_slot(task_id, slot_index, {
        "koc_id": koc_id,
        "status": "accepted",
        "accepted_at": now,
        "pledge_paid": True,
    })

    # 更新 KOC 统计
    koc_store.update(koc_id, {"status": "Collaborating"})

    # 检查是否所有 slot 都被接受了 → 更新 task_status
    _sync_task_status(task_id)

    # Notification: KOC accepted → notify merchant
    if task.merchant_id:
        m = merchant_store.get(task.merchant_id)
        if m:
            merchant_user = user_store.get_by_id(m.user_id)
            if merchant_user:
                notify_user(
                    merchant_user.id,
                    NotifType.TASK_ACCEPTED,
                    "KOC Accepted Your Task",
                    f"A KOC has accepted {task.product_name}",
                    task_id=task_id,
                    resource_path=f"/dashboard/tasks/{task_id}",
                )
    # Notification: KOC accepted → notify KOC themselves
    if koc_uid:
        notify_user(
            koc_uid,
            NotifType.TASK_ACCEPTED,
            "Task Accepted — Pledge Deducted",
            f"You have accepted {task.product_name}. {task.pledge_koc}pt pledge deducted. SLA: ship within 48h, submit content within 14d.",
            task_id=task_id,
            resource_path=f"/portal/tasks/{task_id}",
        )

    return {"status": "accepted", "task_id": task_id, "slot_index": slot_index, "accepted_at": now}


# ═══════════════════════════════════════════
# KOC 拒绝任务
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/reject/{slot_index}")
def reject_task(task_id: str, slot_index: int, current_user: dict = Depends(get_current_user)):
    """KOC 主动拒绝已分配的任务 → 扣信任分 + 自动重推"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can reject tasks")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    # 验证 KOC 身份
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]

    if slot.get("koc_id") != koc_id and current_user.get("role") != "admin":
        raise HTTPException(403, "This slot is not assigned to you")

    if slot.get("status") != "assigned":
        raise HTTPException(400, f"Cannot reject slot in '{slot.get('status')}' status")

    # 扣信任分（主动拒绝是负责任行为，轻度扣分）
    koc_profile = koc_store.get(koc_id)
    if koc_profile:
        new_trust = max(0, koc_profile.trust_score - 3)
        koc_store.update(koc_id, {"trust_score": new_trust})
        # 信任分联动校准等级
        sync_koc_tier(koc_id)

    # ── 通知商家：KOC 拒绝了任务 ──
    if task.merchant_id:
        m = merchant_store.get(task.merchant_id)
        if m:
            notify_user(
                m.user_id,
                NotifType.TASK_DECLINED,
                "KOC Declined Task — Slot Released",
                f"A KOC has declined {task.product_name}. The system will attempt to rematch the slot.",
                task_id=task_id,
                resource_path=f"/dashboard/tasks/{task_id}",
            )

    # ── 通知 KOC：已拒绝任务 ──
    koc_prof = koc_store.get(koc_id)
    if koc_prof and koc_prof.email:
        koc_usr = user_store.get_by_email(koc_prof.email)
        if koc_usr:
            notify_user(
                koc_usr.id,
                NotifType.TASK_DECLINED,
                "Task Declined — Trust Score -3",
                f"You have declined {task.product_name}. Your Trust Score has been reduced by 3 (active rejection).",
                task_id=task_id,
                resource_path=f"/portal/tasks/{task_id}",
            )

    # 标记超时 → 触发重推
    now = datetime.utcnow().isoformat()
    new_reject_count = slot.get("reject_count", 0) + 1

    # 尝试重新匹配
    new_match = rematch_slot(task, slot_index)
    if new_match:
        task_store.update_slot(task_id, slot_index, {
            "koc_id": new_match["koc_id"],
            "status": "assigned",
            "assigned_at": now,
            "reject_count": new_reject_count,
            "match_score": new_match["score"],
        })
    else:
        # No eligible KOC for rematch — clear the slot so it can be re-filled later
        task_store.update_slot(task_id, slot_index, {
            "koc_id": "",
            "status": "pending",
            "assigned_at": "",
            "reject_count": new_reject_count,
        })
    _sync_task_status(task_id)

    return {
        "status": "rejected",
        "task_id": task_id,
        "slot_index": slot_index,
        "rematched": new_match is not None,
        "trust_penalty": -3,
        "new_trust": new_trust if koc_profile else 0,
    }


# ═══════════════════════════════════════════
# 商家发货
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/ship")
def ship_task(task_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """商家发货 → 上传物流单号 + 承运商 + 发货凭证（照片/截图）。商家质押已在发布时扣除，此处不再重复扣款。"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchant can ship")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    # 验证商家身份
    if current_user.get("role") == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m or m.id != task.merchant_id:
            raise HTTPException(403, "Not your task")

    if task.task_status not in ("assigned", "accepted"):
        raise HTTPException(400, f"Task status '{task.task_status}' cannot ship")

    tracking_number = data.get("tracking_number", "")
    if not tracking_number:
        raise HTTPException(400, "tracking_number is required")

    carrier = data.get("carrier", "")  # FedEx, DHL, USPS, SF-Express, Amazon Logistics, etc.
    shipping_proof_urls = data.get("shipping_proof_urls", [])  # 发货凭证照片/截图

    # 商家质押已在发布任务时扣除，此处不再重复扣款
    # 仅更新发货状态 + 物流信息

    now = datetime.utcnow().isoformat()
    task_store.update(task_id, {
        "tracking_number": tracking_number,
        "carrier": carrier,
        "shipping_proof_urls": shipping_proof_urls,
        "task_status": "shipped",
    })

    # 更新所有 accepted slot 的 shipped_at + carrier + proof
    for i, slot in enumerate(task.koc_slots):
        if slot.get("status") == "accepted":
            task_store.update_slot(task_id, i, {
                "status": "shipped",
                "shipped_at": now,
                "tracking_number": tracking_number,
                "carrier": carrier,
                "shipping_proof_urls": shipping_proof_urls,
            })
    # Notification: merchant shipped → notify KOC(s)
    task = task_store.get(task_id)
    koc_profile_ids = [s.get("koc_id") for s in task.koc_slots if s.get("koc_id")]
    for koc_pid in koc_profile_ids:
        koc_prof = koc_store.get(koc_pid)
        if koc_prof and koc_prof.email:
            koc_usr = user_store.get_by_email(koc_prof.email)
            if koc_usr:
                notify_user(
                    koc_usr.id,
                    NotifType.TASK_SHIPPED,
                    "Your Sample Has Shipped",
                    f"Your sample of {task.product_name} shipped via {carrier}. Tracking: {tracking_number}",
                    task_id=task_id,
                    resource_path=f"/portal/tasks/{task_id}",
                    template_name="ship",
                    template_vars={
                        "koc_name": koc_prof.handle or koc_usr.email,
                        "product_name": task.product_name,
                        "tracking": tracking_number,
                        "carrier": carrier,
                    },
                )

    return {
        "status": "shipped",
        "task_id": task_id,
        "tracking_number": tracking_number,
        "carrier": carrier,
        "shipped_at": now,
    }


# ═══════════════════════════════════════════
# KOC 确认收货
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/receive/{slot_index}")
def receive_task(task_id: str, slot_index: int, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 确认收到样品 → 可上传收货照片/备注作为凭证"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can confirm receipt")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    if slot.get("status") != "shipped":
        raise HTTPException(400, f"Slot status is '{slot.get('status')}', not 'shipped'")

    # 验证是该 KOC
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]
    if slot.get("koc_id") != koc_id and current_user.get("role") != "admin":
        raise HTTPException(403, "Not your slot")

    receipt_photo_urls = data.get("receipt_photo_urls", [])  # 收货照片/开箱图
    receipt_notes = data.get("receipt_notes", "")  # 收货备注（如包装完好/破损等）

    now = datetime.utcnow().isoformat()
    task_store.update_slot(task_id, slot_index, {
        "status": "received",
        "received_at": now,
        "receipt_photo_urls": receipt_photo_urls,
        "receipt_notes": receipt_notes,
    })

    # 如果所有 shipped slot 都已 received → 进入 creating
    _sync_task_status(task_id)

    # ── 通知商家：KOC 已确认收货 ──
    if task.merchant_id:
        m = merchant_store.get(task.merchant_id)
        if m:
            notify_user(
                m.user_id,
                NotifType.RECEIPT_CONFIRMED,
                "KOC Confirmed Receipt",
                f"A KOC has confirmed receipt of {task.product_name}. Content creation in progress.",
                task_id=task_id,
                resource_path=f"/dashboard/tasks/{task_id}",
            )

    # ── 通知 KOC：收货已确认 ──
    if koc_id:
        koc_prof = koc_store.get(koc_id)
        if koc_prof and koc_prof.email:
            koc_usr = user_store.get_by_email(koc_prof.email)
            if koc_usr:
                notify_user(
                    koc_usr.id,
                    NotifType.RECEIPT_CONFIRMED,
                    "Receipt Confirmed — Start Creating",
                    f"Your receipt of {task.product_name} has been confirmed. You have 14 days to create and submit content.",
                    task_id=task_id,
                    resource_path=f"/portal/tasks/{task_id}",
                    template_name="receipt_confirmed",
                    template_vars={
                        "koc_name": koc_prof.handle or koc_usr.email,
                        "task_name": task.product_name,
                    },
                )

    return {
        "status": "received",
        "task_id": task_id,
        "slot_index": slot_index,
        "received_at": now,
    }


# ═══════════════════════════════════════════
# KOC 提交内容 → 进入待审核状态
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/submit/{slot_index}")
def submit_content(task_id: str, slot_index: int, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 提交内容链接 → 进入「待商家审核」状态。商家审核通过后才算完成。"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can submit content")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    # 允许 received, creating, revision_requested 状态提交
    # 同时允许 submitted + scraped_status=failed 的重新提交（抓取失败后给 KOC 一次修改机会）
    is_resubmission = (
        slot.get("status") == "submitted"
        and slot.get("scraped_status") == "failed"
        and slot.get("scrape_attempts", 0) < 2
    )
    if slot.get("status") not in ("received", "creating", "revision_requested") and not is_resubmission:
        raise HTTPException(400, f"Slot status '{slot.get('status')}' not ready for submission "
                                 f"(scraped_status={slot.get('scraped_status', 'none')})")

    # 验证是该 KOC
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]
    if slot.get("koc_id") != koc_id and current_user.get("role") != "admin":
        raise HTTPException(403, "Not your slot")

    content_urls = data.get("content_urls", [])
    if not content_urls:
        raise HTTPException(400, "content_urls is required (at least one link)")

    # URL 格式校验：每个链接必须包含已知社交/内容平台域名
    VALID_DOMAINS = [
        "tiktok.com", "youtube.com", "youtu.be", "instagram.com",
        "facebook.com", "fb.com", "x.com", "twitter.com",
        "pinterest.com", "snapchat.com", "linkedin.com", "twitch.tv",
        "xiaohongshu.com", "xhslink.com", "douyin.com",
        "reddit.com", "threads.net", "likee.com", "kwai.com",
        "bilibili.com", "vimeo.com", "dailymotion.com",
    ]
    for url in content_urls:
        if not isinstance(url, str) or not url.strip():
            raise HTTPException(400, f"Invalid content URL: empty or non-string value")
        url_clean = url.strip()
        if not url_clean.lower().startswith(("http://", "https://")):
            raise HTTPException(400, f"URL must start with http:// or https://: {url_clean[:80]}")
        # Extract actual domain via urlparse to prevent substring bypass (e.g. evil.com/tiktok.com)
        parsed = urlparse(url_clean)
        hostname = parsed.hostname or ""
        if not any(hostname == d or hostname.endswith("." + d) for d in VALID_DOMAINS):
            raise HTTPException(400,
                f"URL domain not recognized as a content platform: {url_clean[:80]}. "
                f"Expected one of: {', '.join(VALID_DOMAINS[:8])}...")

    # ⚠️ 不再接受自报表现数据 — 系统会在 24h 后自动通过 Apify 抓取真实数据
    # content_data 初始为空，待 cron scraper 抓取后填充
    now = datetime.utcnow().isoformat()

    # 更新 slot 为 submitted（待商家审核）
    update_fields = {
        "status": "submitted",
        "submitted_at": now,
        "content_urls": content_urls,
        "content_data": {},  # 空 — 由 Apify 24h 后自动填充
    }

    # 如果是抓取失败后的重新提交 → 重置抓取状态（保留 scrape_attempts 计数）
    if is_resubmission:
        update_fields["scraped_status"] = ""
        update_fields["scraped_run_id"] = ""
        # scrape_attempts 保持不变（由 scraper 侧递增）

    task_store.update_slot(task_id, slot_index, update_fields)

    # 不自动完成！等待商家审核
    # 不释放质押！商家 approve 后才释放
    # 不恢复信任分！商家 approve 后才恢复

    # 追加 content_urls 到 task 级别
    all_content_urls = list(task.content_urls)
    for url in content_urls:
        if url not in all_content_urls:
            all_content_urls.append(url)
    task_store.update(task_id, {"content_urls": all_content_urls})

    # 同步 task 整体状态
    _sync_task_status(task_id)

    # Notification: KOC submitted content → notify merchant
    if task.merchant_id:
        m = merchant_store.get(task.merchant_id)
        if m:
            merchant_usr = user_store.get_by_id(m.user_id)
            if merchant_usr:
                notify_user(
                    merchant_usr.id,
                    NotifType.CONTENT_SUBMITTED,
                    "Content Ready for Review",
                    f"KOC has submitted content for {task.product_name}. Please review within 3 days.",
                    task_id=task_id,
                    resource_path=f"/dashboard/tasks/{task_id}",
                )

    return {
        "status": "submitted",
        "task_id": task_id,
        "slot_index": slot_index,
        "submitted_at": now,
        "message": "Content submitted, awaiting merchant review",
    }


# ═══════════════════════════════════════════
# 商家审核 KOC 提交内容（核心验证闭环）
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/review/{slot_index}")
def review_content(task_id: str, slot_index: int, data: dict, current_user: dict = Depends(get_current_user)):
    """商家审核 KOC 提交的内容 → approve 通过（退押金+恢复信任）或 reject 驳回（KOC 可修改重交）。

    审核决策：
    - approve → slot approved → 退双方押金 + 恢复信任分 + 校准等级
    - reject → slot revision_requested → KOC 修改后重新提交（最多 3 次，超限按违约）
    """
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchant can review content")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    if slot.get("status") != "submitted":
        raise HTTPException(400, f"Slot status is '{slot.get('status')}', not 'submitted'")

    # 验证是该 task 的商家
    if current_user.get("role") == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m or m.id != task.merchant_id:
            raise HTTPException(403, "Not your task")

    action = data.get("action", "")  # "approve" | "reject"
    feedback = data.get("feedback", "")  # 审核意见（reject 时必填）

    if action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    if action == "reject" and not feedback:
        raise HTTPException(400, "feedback is required when rejecting")

    koc_id = slot.get("koc_id", "")
    now = datetime.utcnow().isoformat()

    if action == "approve":
        # ── 审核通过 → 完成履约 → 从佣金池转 commission 给 KOC + 退 KOC 质押 ──
        task_store.update_slot(task_id, slot_index, {
            "status": "approved",
            "reviewed_at": now,
            "review_feedback": feedback or "Approved",
            "commission_paid": True,
        })

        koc_uid = _get_koc_user_id(koc_id) if koc_id else ""
        is_sample = task.task_mode == "sample" or task.commission == 0

        if slot.get("pledge_paid"):
            # 质押全额退还 → bonus（原路返回，不可提现）
            pledge_return = task.pledge_koc  # 佣金模式 10pt / 寄样模式 5pt
            if koc_uid:
                credit_store.add_credits(koc_uid, pledge_return, "pledge_return_koc",
                                         task_id, f"Pledge returned: {task.product_name}",
                                         withdrawable=False)

            if is_sample:
                # 寄样模式：无佣金，不产生平台抽成
                koc_commission = 0
                platform_fee = 0
            else:
                # 平台抽成 = max(1pt, int(commission × 10%))
                platform_fee = max(KOC_PLATFORM_FEE_MIN, int(task.commission * KOC_PLATFORM_FEE_RATE))
                # 佣金 90% → withdrawable（KOC 真正赚到的，可提现）
                koc_commission = task.commission - platform_fee
                if koc_commission > 0 and koc_uid:
                    credit_store.add_credits(koc_uid, koc_commission, "commission_earned",
                                             task_id, f"Commission earned ({task.commission}pt − {platform_fee}pt fee): {task.product_name}",
                                             withdrawable=True)
                # 平台抽成
                credit_store.add_credits("platform", platform_fee, "koc_platform_fee",
                                         task_id, f"KOC platform fee ({platform_fee}pt) from: {task.product_name}")

        # 恢复 KOC 信任分 + 统计
        koc = koc_store.get(koc_id) if koc_id else None
        if koc:
            new_trust = min(100, koc.trust_score + 3)
            koc_store.update(koc_id, {
                "completed_tasks": koc.completed_tasks + 1,
                "total_collaborations": koc.total_collaborations + 1,
                "trust_score": new_trust,
            })
            sync_koc_tier(koc_id)

        # 恢复商家信任分 + 统计
        m = merchant_store.get(task.merchant_id)
        if m:
            new_m_trust = min(100, m.trust_score + 3)
            merchant_store.update(task.merchant_id, {
                "total_collaborations": m.total_collaborations + 1,
                "total_tasks_completed": m.total_tasks_completed + 1,
                "trust_score": new_m_trust,
            })
            sync_merchant_tier(task.merchant_id)

        # 同步 task 整体状态
        _sync_task_status(task_id)

        # Notification: content approved → notify KOC
        if koc_id:
            koc_prof = koc_store.get(koc_id)
            if koc_prof and koc_prof.email:
                koc_usr = user_store.get_by_email(koc_prof.email)
                if koc_usr:
                    total_earned = koc_commission + KOC_FIXED_PLEDGE
                    notify_user(
                        koc_usr.id,
                        NotifType.CONTENT_APPROVED,
                        "Content Approved — Earnings Credited",
                        f"Your content for {task.product_name} has been approved. +{koc_commission}pt withdrawable + {pledge_return}pt pledge returned. Trust Score +3.",
                        task_id=task_id,
                        resource_path=f"/portal/tasks/{task_id}",
                        template_name="review_approved",
                        template_vars={
                            "koc_name": koc_prof.handle or koc_usr.email,
                            "product_name": task.product_name,
                        },
                    )

        return {
            "status": "approved",
            "task_id": task_id,
            "slot_index": slot_index,
            "reviewed_at": now,
            "commission_earned": koc_commission,
            "platform_fee": platform_fee,
            "pledge_returned_koc": pledge_return if slot.get("pledge_paid") else 0,
            "task_mode": task.task_mode,
            "is_sample": is_sample,
        }

    else:  # reject
        # ── 驳回 → KOC 修改重交（1 次机会）──
        revision_count = slot.get("revision_count", 0) + 1

        if revision_count > MAX_REVISIONS:
            # ── 第 2 次 reject → AI 终审 ──
            koc_for_judge = koc_store.get(koc_id) if koc_id else None
            # Resolve product info for better AI judgment
            judge_product = product_store.get(task.product_id) if task.product_id else None
            judge_result = judge_submission(
                product_name=task.product_name,
                product_category=judge_product.category if judge_product else "",
                product_description=(judge_product.description or "")[:500] if judge_product else "",
                content_urls=slot.get("content_urls", []),
                content_data=slot.get("content_data", {}),
                merchant_rejection_reasons=[
                    slot.get("review_feedback", ""),
                    feedback,
                ],
                koc_handle=koc_for_judge.handle if koc_for_judge else "",
                koc_follower_count=koc_for_judge.follower_count if koc_for_judge else 0,
                koc_performance_score=koc_for_judge.performance_score if koc_for_judge else 0.0,
                koc_completed_tasks=koc_for_judge.completed_tasks if koc_for_judge else 0,
                accepted_at=slot.get("accepted_at", ""),
                submitted_at=slot.get("submitted_at", ""),
            )

            if judge_result["verdict"] == "approve":
                # AI 判 KOC 通过 → 同 approve 流程
                task_store.update_slot(task_id, slot_index, {
                    "status": "approved",
                    "reviewed_at": now,
                    "review_feedback": f"AI-approved (merchant rejected twice, AI overruled): {judge_result['reason']}",
                    "commission_paid": True,
                    "revision_count": revision_count,
                })

                is_sample = task.task_mode == "sample" or task.commission == 0
                pledge_return = task.pledge_koc

                if is_sample:
                    koc_commission = 0
                    platform_fee = 0
                else:
                    platform_fee = max(KOC_PLATFORM_FEE_MIN, int(task.commission * KOC_PLATFORM_FEE_RATE))
                    koc_commission = task.commission - platform_fee

                koc_uid = _get_koc_user_id(koc_id) if koc_id else ""
                if slot.get("pledge_paid"):
                    # 质押全额退还 → bonus（不可提现）
                    if koc_uid:
                        credit_store.add_credits(koc_uid, pledge_return, "pledge_return_koc",
                                                 task_id, f"Pledge returned (AI overruled): {task.product_name}",
                                                 withdrawable=False)
                    if not is_sample:
                        # 佣金 90% → withdrawable
                        if koc_commission > 0 and koc_uid:
                            credit_store.add_credits(koc_uid, koc_commission, "commission_earned",
                                                     task_id, f"Commission earned (AI overruled, {task.commission}pt − {platform_fee}pt fee): {task.product_name}",
                                                     withdrawable=True)
                        # 平台抽成
                        credit_store.add_credits("platform", platform_fee, "koc_platform_fee",
                                                 task_id, f"KOC platform fee (AI overruled): {task.product_name}")

                if koc_for_judge:
                    koc_store.update(koc_id, {
                        "completed_tasks": koc_for_judge.completed_tasks + 1,
                        "total_collaborations": koc_for_judge.total_collaborations + 1,
                        "trust_score": min(100, koc_for_judge.trust_score + 3),
                    })
                    sync_koc_tier(koc_id)

                m = merchant_store.get(task.merchant_id)
                if m:
                    # AI overruled merchant's rejection — merchant does NOT earn trust bonus
                    merchant_store.update(task.merchant_id, {
                        "total_collaborations": m.total_collaborations + 1,
                        "total_tasks_completed": m.total_tasks_completed + 1,
                    })
                    sync_merchant_tier(task.merchant_id)

                _sync_task_status(task_id)

                # ── 通知 KOC：AI 推翻商家拒因，内容通过 ──
                total_earned = koc_commission + KOC_FIXED_PLEDGE
                if koc_uid:
                    notify_user(
                        koc_uid,
                        NotifType.CONTENT_AI_OVERRULE,
                        "AI Overruled — Content Approved",
                        f"{task.product_name}: AI overruled the merchant's rejection. +{koc_commission}pt withdrawable + {KOC_FIXED_PLEDGE}pt pledge returned. Reason: {judge_result['reason']}",
                        task_id=task_id,
                        resource_path=f"/portal/tasks/{task_id}",
                    )

                # ── 通知商家：AI 推翻驳回 ──
                m = merchant_store.get(task.merchant_id)
                if m and m.user_id:
                    notify_user(
                        m.user_id,
                        NotifType.CONTENT_AI_OVERRULE,
                        "AI Overruled Your Rejection — Content Approved",
                        f"{task.product_name}: AI reviewed the content and overruled your rejection. Commission released to KOC. Reason: {judge_result['reason']}",
                        task_id=task_id,
                        resource_path=f"/dashboard/tasks/{task_id}",
                    )

                return {
                    "status": "approved",
                    "task_id": task_id,
                    "slot_index": slot_index,
                    "verdict": "AI overruled merchant rejection",
                    "ai_reason": judge_result["reason"],
                    "ai_confidence": judge_result["confidence"],
                }
            else:
                # AI 判 KOC 不通过 → KOC 违约
                task_store.update_slot(task_id, slot_index, {
                    "status": "timed_out",
                    "reviewed_at": now,
                    "review_feedback": f"AI-rejected: {judge_result['reason']}",
                    "revision_count": revision_count,
                    "pledge_paid": False,
                })

                # 退还 commission 给商家（该 slot KOC 没完成）→ bonus，不可提现
                m_uid = _get_merchant_user_id(task.merchant_id)
                credit_store.add_credits(m_uid, task.commission, "commission_returned",
                                         task_id, f"Commission returned (KOC rejected by AI): {task.product_name}",
                                         withdrawable=False)

                # KOC 质押 10pt 不退 → 全部给平台
                credit_store.add_credits("platform", KOC_FIXED_PLEDGE, "forfeited_pledge",
                                         task_id, f"KOC forfeited pledge: {task.product_name}")

                if koc_id:
                    koc = koc_store.get(koc_id)
                    if koc:
                        koc_store.update(koc_id, {
                            "trust_score": max(0, koc.trust_score - 15),
                        })
                        sync_koc_tier(koc_id)

                _sync_task_disputed(task_id)

                # ── 通知 KOC：AI 终审判不通过 ──
                if koc_id:
                    koc_uid = _get_koc_user_id(koc_id)
                    if koc_uid:
                        notify_user(
                            koc_uid,
                            NotifType.VIOLATION,
                            "AI Final Judgment — Content Rejected",
                            f"{task.product_name}: AI reviewed your content and upheld the merchant's rejection. 10pt pledge forfeited, Trust Score -15. Reason: {judge_result['reason']}",
                            task_id=task_id,
                            resource_path=f"/portal/tasks/{task_id}",
                            template_name="violation",
                            template_vars={
                                "koc_name": koc_for_judge.handle if koc_for_judge else "Creator",
                                "reason": judge_result['reason'],
                                "penalty": "10pt pledge forfeited, Trust Score -15",
                            },
                        )

                # ── 通知商家：AI 终审驳回 KOC ──
                m_uid = _get_merchant_user_id(task.merchant_id)
                if m_uid:
                    notify_user(
                        m_uid,
                        NotifType.CONTENT_AI_OVERRULE,
                        "AI Final Judgment — KOC Content Rejected",
                        f"{task.product_name}: AI upheld your rejection. {task.commission}pt commission refunded. Reason: {judge_result['reason']}",
                        task_id=task_id,
                        resource_path=f"/dashboard/tasks/{task_id}",
                    )

                return {
                    "status": "timed_out",
                    "task_id": task_id,
                    "slot_index": slot_index,
                    "verdict": "AI rejected KOC content",
                    "ai_reason": judge_result["reason"],
                    "ai_confidence": judge_result["confidence"],
                }

        # 第 1 次 reject → 正常驳回，KOC 可修改重交
        task_store.update_slot(task_id, slot_index, {
            "status": "revision_requested",
            "reviewed_at": now,
            "review_feedback": feedback,
            "revision_count": revision_count,
        })

        # ── 通知 KOC：内容需修改 ──
        if koc_id:
            koc_uid = _get_koc_user_id(koc_id)
            if koc_uid:
                revisions_left = MAX_REVISIONS + 1 - revision_count
                notify_user(
                    koc_uid,
                    NotifType.CONTENT_REVISION,
                    "Content Needs Revision",
                    f"{task.product_name}: Brand requested revisions. Reason: {feedback}. You have {revisions_left} resubmission attempt(s) remaining. Deadline: 3 days.",
                    task_id=task_id,
                    resource_path=f"/portal/tasks/{task_id}",
                    template_name="review_revision",
                    template_vars={
                        "koc_name": koc_for_judge.handle if (koc_for_judge := koc_store.get(koc_id)) else "Creator",
                        "product_name": task.product_name,
                        "note": feedback,
                    },
                )

        # ── 通知商家：已要求 KOC 修改 ──
        m_uid = _get_merchant_user_id(task.merchant_id)
        if m_uid:
            notify_user(
                m_uid,
                NotifType.CONTENT_REVISION,
                "Revision Requested — Awaiting KOC Resubmission",
                f"{task.product_name}: You requested content revisions. KOC has {MAX_REVISIONS + 1 - revision_count} resubmission attempt(s) remaining (3 day deadline).",
                task_id=task_id,
                resource_path=f"/dashboard/tasks/{task_id}",
            )

        return {
            "status": "revision_requested",
            "task_id": task_id,
            "slot_index": slot_index,
            "revision_count": revision_count,
            "revisions_remaining": MAX_REVISIONS + 1 - revision_count,
            "message": f"Revision requested. KOC has {MAX_REVISIONS + 1 - revision_count} attempt(s) remaining. Next rejection triggers AI review.",
        }


# ═══════════════════════════════════════════
# KOC 更新内容表现数据
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/metrics/{slot_index}")
def update_content_metrics(task_id: str, slot_index: int, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 独立更新内容表现数据（播放量/点赞/评论/分享/转化等）。

    内容发布后数据持续增长，KOC 可随时调用此接口更新。
    slot 状态为 submitted/approved/completed 时均可更新。
    """
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can update metrics")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    if slot.get("status") not in ("submitted", "approved", "completed"):
        raise HTTPException(400, f"Slot status '{slot.get('status')}' — metrics can only be updated after submission")

    # 验证是该 KOC
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]
    if slot.get("koc_id") != koc_id and current_user.get("role") != "admin":
        raise HTTPException(403, "Not your slot")

    # 合并现有 data（保留旧值，新值覆盖）
    existing = dict(slot.get("content_data", {}) or {})
    existing.update({k: v for k, v in data.items() if k not in ("engagement_rate", "last_updated")})

    # 计算互动率
    views = existing.get("views", 0)
    if views > 0:
        engagement = (existing.get("likes", 0) + existing.get("comments", 0) +
                      existing.get("shares", 0) + existing.get("saves", 0))
        existing["engagement_rate"] = round(engagement / views * 100, 1)
    else:
        existing["engagement_rate"] = 0.0

    existing["last_updated"] = datetime.utcnow().isoformat()

    task_store.update_slot(task_id, slot_index, {"content_data": existing})

    # 同步 KOC 综合表现分
    _sync_koc_performance(koc_id)

    return {
        "status": "updated",
        "task_id": task_id,
        "slot_index": slot_index,
        "content_data": existing,
    }


# ═══════════════════════════════════════════
# 内容表现看板（商家视角）
# ═══════════════════════════════════════════

@router.get("/tasks/{task_id}/performance")
def get_task_performance(task_id: str, current_user: dict = Depends(get_current_user)):
    """商家查看任务下所有 KOC 的内容表现汇总 + 单 KOC 明细"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchant can view performance")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.get("role") == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m or m.id != task.merchant_id:
            raise HTTPException(403, "Not your task")

    # 汇总
    summary = {
        "total_views": 0, "total_likes": 0, "total_comments": 0,
        "total_shares": 0, "total_saves": 0, "total_clicks": 0,
        "total_conversions": 0, "total_revenue": 0.0,
        "total_engagement": 0, "average_engagement_rate": 0.0,
        "slots_with_data": 0,
    }

    slots_detail = []
    for i, slot in enumerate(task.koc_slots):
        cd = slot.get("content_data", {}) or {}
        detail = {
            "slot_index": i,
            "koc_anon_id": f"KOC-{slot.get('koc_id', '')[:4].upper()}" if slot.get("koc_id") else "-",
            "status": slot.get("status", "unknown"),
            "content_urls": slot.get("content_urls", []),
            "metrics": {
                "views": cd.get("views", 0),
                "likes": cd.get("likes", 0),
                "comments": cd.get("comments", 0),
                "shares": cd.get("shares", 0),
                "saves": cd.get("saves", 0),
                "clicks": cd.get("clicks", 0),
                "conversions": cd.get("conversions", 0),
                "revenue": cd.get("revenue", 0.0),
                "engagement_rate": cd.get("engagement_rate", 0.0),
                "platform": cd.get("platform", ""),
                "last_updated": cd.get("last_updated", ""),
            },
            # ── 数据验证状态（商家可见）──
            "verification": {
                "status": slot.get("scraped_status", ""),
                "scraped": slot.get("scraped_data", {}),
            },
        }
        slots_detail.append(detail)

        # 累加汇总
        if cd.get("views", 0) > 0:
            summary["slots_with_data"] += 1
        summary["total_views"] += cd.get("views", 0)
        summary["total_likes"] += cd.get("likes", 0)
        summary["total_comments"] += cd.get("comments", 0)
        summary["total_shares"] += cd.get("shares", 0)
        summary["total_saves"] += cd.get("saves", 0)
        summary["total_clicks"] += cd.get("clicks", 0)
        summary["total_conversions"] += cd.get("conversions", 0)
        summary["total_revenue"] += cd.get("revenue", 0.0)
        summary["total_engagement"] += (
            cd.get("likes", 0) + cd.get("comments", 0) +
            cd.get("shares", 0) + cd.get("saves", 0)
        )

    # 平均互动率
    rates = [s["metrics"]["engagement_rate"] for s in slots_detail if s["metrics"]["views"] > 0]
    if rates:
        summary["average_engagement_rate"] = round(sum(rates) / len(rates), 1)

    # 按互动率降序排列
    slots_detail.sort(key=lambda s: s["metrics"]["engagement_rate"], reverse=True)

    return {
        "task_id": task.id,
        "product_name": task.product_name,
        "task_type": task.task_type,
        "task_status": task.task_status,
        "summary": summary,
        "slots": slots_detail,
    }


# ═══════════════════════════════════════════
# 数据报表（商家视角）
# ═══════════════════════════════════════════

@router.get("/tasks/{task_id}/report")
def get_task_report(task_id: str, current_user: dict = Depends(get_current_user)):
    """商家看单个任务的数据报表"""
    if current_user.get("role") not in ("merchant", "admin"):
        raise HTTPException(403, "Only merchant can view reports")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    if current_user.get("role") == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m or m.id != task.merchant_id:
            raise HTTPException(403, "Not your task")

    # 构建报表：每个 KOC slot 的数据
    koc_reports = []
    for i, slot in enumerate(task.koc_slots):
        koc = koc_store.get(slot.get("koc_id", ""))
        koc_reports.append({
            "slot_index": i,
            "koc_anon_id": f"KOC-{slot.get('koc_id', '')[:4].upper()}" if slot.get("koc_id") else "-",
            "status": slot.get("status", "unknown"),
            "content_urls": slot.get("content_urls", []),
            "content_data": slot.get("content_data", {}),
            "accepted_at": slot.get("accepted_at", ""),
            "shipped_at": slot.get("shipped_at", ""),
            "received_at": slot.get("received_at", ""),
            "submitted_at": slot.get("submitted_at", ""),
            # ── 数据验证透明化 ──
            "verification": {
                "status": slot.get("scraped_status", ""),
                "scraped": slot.get("scraped_data", {}),
            },
        })

    # 汇总统计
    total_slots = len(task.koc_slots)
    submitted_slots = sum(1 for s in task.koc_slots if s.get("status") == "submitted")
    total_content_urls = sum(len(s.get("content_urls", [])) for s in task.koc_slots)
    total_commission_paid = sum(s.get("commission_paid", 0) for s in task.koc_slots)

    # 内容表现汇总
    perf_views = sum((s.get("content_data", {}) or {}).get("views", 0) for s in task.koc_slots)
    perf_likes = sum((s.get("content_data", {}) or {}).get("likes", 0) for s in task.koc_slots)
    perf_comments = sum((s.get("content_data", {}) or {}).get("comments", 0) for s in task.koc_slots)
    perf_shares = sum((s.get("content_data", {}) or {}).get("shares", 0) for s in task.koc_slots)
    perf_conversions = sum((s.get("content_data", {}) or {}).get("conversions", 0) for s in task.koc_slots)
    perf_revenue = sum((s.get("content_data", {}) or {}).get("revenue", 0.0) for s in task.koc_slots)

    return {
        "task_id": task.id,
        "product_name": task.product_name,
        "task_type": task.task_type,
        "task_status": task.task_status,
        "koc_required": task.koc_required,
        "koc_filled": sum(1 for s in task.koc_slots if s.get("koc_id")),
        "tracking_number": task.tracking_number,
        "commission_per_koc": task.commission,
        "total_commission_paid": total_commission_paid,
        "total_content_urls": total_content_urls,
        "submitted_slots": submitted_slots,
        "total_slots": total_slots,
        "koc_reports": koc_reports,
        "performance": {
            "total_views": perf_views,
            "total_likes": perf_likes,
            "total_comments": perf_comments,
            "total_shares": perf_shares,
            "total_conversions": perf_conversions,
            "total_revenue": perf_revenue,
        },
        "created_at": task.created_at,
    }


# ═══════════════════════════════════════════
# 超时处理（Admin 手动触发 / Cron 自动调用）
# ═══════════════════════════════════════════

@router.post("/tasks/{task_id}/force-rematch/{slot_index}")
def force_rematch(task_id: str, slot_index: int, current_user: dict = Depends(require_admin)):
    """Admin 强制重推某个 slot"""
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    old_koc_id = slot.get("koc_id", "")

    # 重新匹配
    new_match = rematch_slot(task, slot_index)
    if not new_match:
        raise HTTPException(400, "No eligible KOC found for rematch")

    # 更新 slot
    now = datetime.utcnow().isoformat()
    task_store.update_slot(task_id, slot_index, {
        "koc_id": new_match["koc_id"],
        "status": "assigned",
        "assigned_at": now,
        "accepted_at": "",
        "reject_count": slot.get("reject_count", 0) + 1,
        "match_score": new_match["score"],
    })

    return {
        "status": "rematched",
        "task_id": task_id,
        "slot_index": slot_index,
        "old_koc_id": old_koc_id,
        "new_koc_id": new_match["koc_id"],
        "new_score": new_match["score"],
    }


# ═══════════════════════════════════════════
# 内部辅助
# ═══════════════════════════════════════════

def _sync_task_status(task_id: str):
    """根据 slot 状态同步 task 整体状态。

    V2 状态优先级（从高到低）：
    - 全部 approved/completed → completed
    - 有 submitted/approved/revision_requested → creating（内容审核中）
    - 有 received → creating
    - 有 shipped → shipped
    - 有 accepted → accepted
    """
    task = task_store.get(task_id)
    if not task:
        return

    slots = task.koc_slots
    if not slots:
        return

    statuses = [s.get("status", "unknown") for s in slots]
    prev_status = task.task_status

    # 全部 slot 已 assigned（空位待接）→ 进入任务广场
    if all(s in ("assigned",) for s in statuses) and any(s == "assigned" for s in statuses):
        task_store.update(task_id, {"task_status": "assigned"})
    # 全部 slot 已 approved 或 completed → 任务完成
    elif all(s in ("approved", "completed") for s in statuses):
        task_store.update(task_id, {"task_status": "completed"})

        # ── 首次完成时发评分提醒 ──
        if prev_status != "completed":
            from stores.koc_store import koc_store as _ks
            from stores.merchant_store import merchant_store as _ms
            from stores.user_store import user_store as _us
            from services.notifier import notify_user as _notify

            # 通知商家去评每个 KOC
            if task.merchant_id:
                m = _ms.get(task.merchant_id)
                if m:
                    for i, slot in enumerate(slots):
                        kid = slot.get("koc_id", "")
                        if not kid:
                            continue
                        koc = _ks.get(kid)
                        label = koc.display_name or f"Creator_{kid[:6]}" if koc else f"KOC {kid[:8]}"
                        _notify(
                            m.user_id,
                            "content_reviewed",
                            f"⭐ Rate {label}",
                            f"Collaboration on 「{task.product_name}」is complete. How was {label}?",
                            task_id=task_id,
                            resource_path=f"/dashboard/tasks/{task_id}?review={i}",
                        )

            # 通知每个 approved 的 KOC 去评商家
            for i, slot in enumerate(slots):
                kid = slot.get("koc_id", "")
                if not kid or slot.get("status") not in ("approved", "completed"):
                    continue
                koc = _ks.get(kid)
                if koc and koc.email:
                    koc_user = _us.get_by_email(koc.email)
                    if koc_user:
                        brand = task.merchant_id
                        m = _ms.get(task.merchant_id)
                        if m:
                            brand = m.company_name or "Brand"
                        _notify(
                            koc_user.id,
                            "content_reviewed",
                            f"⭐ Rate {brand}",
                            f"Collaboration on 「{task.product_name}」is complete. How was your experience with {brand}?",
                            task_id=task_id,
                            resource_path=f"/portal/tasks/{task_id}?review={i}",
                        )

    # 有内容在审核或创作中
    elif any(s in ("submitted", "approved", "revision_requested") for s in statuses):
        task_store.update(task_id, {"task_status": "creating"})
    elif any(s == "received" for s in statuses):
        task_store.update(task_id, {"task_status": "creating"})
    elif any(s == "shipped" for s in statuses):
        task_store.update(task_id, {"task_status": "shipped"})
    elif any(s == "accepted" for s in statuses):
        task_store.update(task_id, {"task_status": "accepted"})


# ── 兼容旧 endpoint（deprecated）──

@router.put("/tasks/{task_id}/sample")
def update_sample_status(task_id: str, data: dict, current_user: dict = Depends(require_admin)):
    """DEPRECATED: 旧 sample_status 接口，保留兼容"""
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    sample_status = data.get("sample_status", "sent")
    # 转为新状态机
    if sample_status == "sent":
        task_store.update(task_id, {"task_status": "shipped"})
    elif sample_status == "received":
        task_store.update(task_id, {"task_status": "creating"})
    return task_store.get(task_id).model_dump()


def _sync_task_disputed(task_id: str):
    """如果所有 slot 已超时/完成/approved，标记任务为 disputed。
    ⚠️ KEEP IN SYNC with cron._sync_task_disputed (same function duplicated to avoid circular import)."""
    task = task_store.get(task_id)
    if not task:
        return
    slots = task.koc_slots
    if not slots:
        return
    active = sum(1 for s in slots if s.get("status") not in ("completed", "approved", "timed_out", "rejected"))
    if active == 0:
        task_store.update(task_id, {"task_status": "disputed"})


def _sync_koc_performance(koc_id: str):
    """扫描该 KOC 所有 slot 的 content_data → 计算 performance_score 并写入 KocProfile。

    performance_score 用 log-scale 归一化到 0-100：
    - 0 互动 → 0 分
    - 平均 100 互动/帖 → ~69 分
    - 平均 1000 互动/帖 → ~100 分
    """
    import math
    all_tasks = task_store.list_by_koc(koc_id)
    total_views = 0
    total_engagement = 0
    total_posts = 0

    for task in all_tasks:
        for slot in task.koc_slots:
            if slot.get("koc_id") != koc_id:
                continue
            cd = slot.get("content_data", {})
            if not cd or not isinstance(cd, dict):
                continue
            v = cd.get("views", 0)
            if v <= 0:
                continue
            total_views += v
            total_engagement += (
                cd.get("likes", 0) + cd.get("comments", 0) +
                cd.get("shares", 0) + cd.get("saves", 0)
            )
            total_posts += 1

    if total_posts > 0 and total_views > 0:
        avg_engagement = total_engagement / max(total_posts, 1)
        raw = math.log(avg_engagement + 1) * 15
        performance_score = min(100, round(raw, 1))
    else:
        performance_score = 0.0

    koc_store.update(koc_id, {
        "performance_score": performance_score,
        "total_engagement": total_engagement,
        "total_content_posts": total_posts,
    })
