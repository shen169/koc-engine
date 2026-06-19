"""任务/履约路由 V2 — 批量 KOC + 质押 + 全状态机"""

from datetime import datetime, timezone, timedelta
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
from config import PLATFORM_SERVICE_FEE, KOC_PLATFORM_FEE, PLEDGE_PER_SLOT, MAX_REVISIONS
from models import ContentMetrics

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

    # ── 质押规则（固定每 slot 10 点）──
    pledge_merchant = PLEDGE_PER_SLOT * koc_required   # 商家质押 = 10 × KOC人数
    pledge_koc = PLEDGE_PER_SLOT                        # KOC 质押 = 10 点

    task = KocTask(
        merchant_id=merchant_id,
        product_id=data.get("product_id", ""),
        product_asin=data.get("product_asin", ""),
        product_name=data.get("product_name", ""),
        task_type=task_type,
        task_status="pending",
        koc_required=koc_required,
        koc_slots=[],  # 初始化为空，后续匹配引擎填充
        pledge_merchant=pledge_merchant,
        pledge_koc=pledge_koc,
        commission=commission,
        due_at=data.get("due_at", ""),
    )
    task_store.create(task)

    # ── 平台服务费：建任务后扣（余额预检 + 实扣）──
    m_uid = _get_merchant_user_id(merchant_id)
    fee_result = credit_store.deduct_credits(
        m_uid, PLATFORM_SERVICE_FEE, "platform_fee",
        task.id, f"Platform service fee for task: {task.product_name}"
    )
    if fee_result is None:
        raise HTTPException(400, f"Insufficient credits for platform fee ({PLATFORM_SERVICE_FEE} pts)")

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
            })
        task_store.update(task.id, {"koc_slots": slots})

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

    # 标记超时 → 触发重推
    now = datetime.utcnow().isoformat()
    task_store.update_slot(task_id, slot_index, {
        "status": "timed_out",
        "reject_count": slot.get("reject_count", 0) + 1,
    })

    # 尝试重新匹配
    new_match = rematch_slot(task, slot_index)
    if new_match:
        task_store.update_slot(task_id, slot_index, {
            "koc_id": new_match["koc_id"],
            "status": "assigned",
            "assigned_at": now,
            "reject_count": slot.get("reject_count", 0) + 1,
            "match_score": new_match["score"],
        })

    return {
        "status": "rejected",
        "task_id": task_id,
        "slot_index": slot_index,
        "trust_penalty": -10,
        "new_trust": koc_profile.trust_score - 10 if koc_profile else 0,
    }


# ═══════════════════════════════════════════
# 商家发货
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/ship")
def ship_task(task_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """商家发货 → 上传物流单号 + 承运商 + 发货凭证（照片/截图）→ 扣商家质押点"""
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

    # 扣商家质押点
    if task.pledge_merchant > 0:
        m_uid = _get_merchant_user_id(task.merchant_id)
        result = credit_store.deduct_credits(
            m_uid, task.pledge_merchant, "pledge_merchant",
            task_id, f"Pledge for task: {task.product_name}"
        )
        if result is None:
            raise HTTPException(400, "Insufficient credits for pledge")

    now = datetime.utcnow().isoformat()
    task_store.update(task_id, {
        "tracking_number": tracking_number,
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
    if slot.get("status") not in ("received", "creating", "revision_requested"):
        raise HTTPException(400, f"Slot status '{slot.get('status')}' not ready for submission")

    # 验证是该 KOC
    user = user_store.get_by_id(current_user["sub"])
    koc = koc_store.get_by_email(user.email) if user else None
    koc_id = koc.id if koc else current_user["sub"]
    if slot.get("koc_id") != koc_id and current_user.get("role") != "admin":
        raise HTTPException(403, "Not your slot")

    content_urls = data.get("content_urls", [])
    if not content_urls:
        raise HTTPException(400, "content_urls is required (at least one link)")

    # 可选的初始表现数据
    raw_metrics = data.get("content_data", {})
    content_data = {}
    if raw_metrics and isinstance(raw_metrics, dict) and raw_metrics.get("views", 0) > 0:
        try:
            metrics = ContentMetrics(**raw_metrics)
            # 服务端计算互动率
            if metrics.views > 0:
                metrics.engagement_rate = round(
                    (metrics.likes + metrics.comments + metrics.shares + metrics.saves)
                    / metrics.views * 100, 1
                )
            metrics.last_updated = datetime.utcnow().isoformat()
            content_data = metrics.model_dump()
        except Exception:
            content_data = {}

    now = datetime.utcnow().isoformat()

    # 更新 slot 为 submitted（待商家审核）
    task_store.update_slot(task_id, slot_index, {
        "status": "submitted",
        "submitted_at": now,
        "content_urls": content_urls,
        "content_data": content_data,
    })

    # 如果提交了表现数据 → 同步 KOC performance_score
    if content_data:
        _sync_koc_performance(koc_id)

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
        # ── 审核通过 → 完成履约 + 确认佣金 ──
        task_store.update_slot(task_id, slot_index, {
            "status": "approved",
            "reviewed_at": now,
            "review_feedback": feedback or "Approved",
            "commission_paid": True,
        })

        # 释放 KOC 质押（扣平台费）
        koc_uid = _get_koc_user_id(koc_id) if koc_id else ""
        if task.pledge_koc > 0 and slot.get("pledge_paid"):
            koc_return = task.pledge_koc - KOC_PLATFORM_FEE
            if koc_return > 0 and koc_uid:
                credit_store.add_credits(koc_uid, koc_return, "pledge_return_koc",
                                         task_id, f"Pledge returned (after platform fee): {task.product_name}")
            credit_store.add_credits("platform", KOC_PLATFORM_FEE, "koc_platform_fee",
                                     task_id, f"KOC platform fee from: {task.product_name}")

        # 退还商家质押（全额）
        if task.pledge_merchant > 0:
            m_uid = _get_merchant_user_id(task.merchant_id)
            credit_store.add_credits(m_uid, task.pledge_merchant, "pledge_return_merchant",
                                     task_id, f"Pledge returned for: {task.product_name}")

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

        return {
            "status": "approved",
            "task_id": task_id,
            "slot_index": slot_index,
            "reviewed_at": now,
            "pledge_returned_koc": task.pledge_koc - KOC_PLATFORM_FEE if task.pledge_koc > 0 else 0,
            "pledge_returned_merchant": task.pledge_merchant,
        }

    else:  # reject
        # ── 驳回 → KOC 修改重交 ──
        revision_count = slot.get("revision_count", 0) + 1

        if revision_count >= MAX_REVISIONS:
            # 超出修改次数 → 按 KOC 违约处理
            task_store.update_slot(task_id, slot_index, {
                "status": "timed_out",
                "reviewed_at": now,
                "review_feedback": feedback,
                "revision_count": revision_count,
            })

            # 退商家质押
            if task.pledge_merchant > 0:
                m_uid = _get_merchant_user_id(task.merchant_id)
                credit_store.add_credits(m_uid, task.pledge_merchant, "breach_compensation_merchant",
                                         task_id, f"KOC max revisions exceeded: {task.product_name}")

            # 扣 KOC 信任分
            if koc_id:
                koc = koc_store.get(koc_id)
                if koc:
                    koc_store.update(koc_id, {
                        "trust_score": max(0, koc.trust_score - 15),
                    })
                    sync_koc_tier(koc_id)

            _sync_task_disputed(task_id)

            return {
                "status": "timed_out",
                "task_id": task_id,
                "slot_index": slot_index,
                "reason": f"Max revisions ({MAX_REVISIONS}) exceeded → KOC defaulted",
                "revision_count": revision_count,
            }

        # 正常驳回 → KOC 可修改重交
        task_store.update_slot(task_id, slot_index, {
            "status": "revision_requested",
            "reviewed_at": now,
            "review_feedback": feedback,
            "revision_count": revision_count,
        })

        return {
            "status": "revision_requested",
            "task_id": task_id,
            "slot_index": slot_index,
            "revision_count": revision_count,
            "revisions_remaining": MAX_REVISIONS - revision_count,
            "message": f"Revision requested. KOC has {MAX_REVISIONS - revision_count} attempt(s) remaining.",
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

    # 全部 slot 已 approved 或 completed → 任务完成
    if all(s in ("approved", "completed") for s in statuses):
        task_store.update(task_id, {"task_status": "completed"})
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
    """如果所有 slot 已超时/完成/approved，标记任务为 disputed"""
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
