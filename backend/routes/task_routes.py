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
from auth import get_current_user, require_admin
from config import PLATFORM_SERVICE_FEE

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

    # ── 质押规则 ──
    total_commission = commission * koc_required
    pledge_merchant_min = total_commission     # 商家最低质押 = 总佣金（确保样品必发）
    pledge_koc_min = commission                 # KOC 最低质押 = 单笔佣金

    pledge_merchant = data.get("pledge_merchant", pledge_merchant_min)
    pledge_koc = data.get("pledge_koc", pledge_koc_min)

    # 不能低于最低
    if pledge_merchant < pledge_merchant_min:
        raise HTTPException(400,
            f"Merchant pledge must be >= total commission ({pledge_merchant_min} pts). "
            f"Got {pledge_merchant}. This ensures samples are shipped.")
    if pledge_koc < pledge_koc_min:
        raise HTTPException(400,
            f"KOC pledge must be >= commission ({pledge_koc_min} pts). Got {pledge_koc}.")

    # ── 平台服务费：发任务即扣 ──
    m_uid = _get_merchant_user_id(merchant_id)
    fee_result = credit_store.deduct_credits(
        m_uid, PLATFORM_SERVICE_FEE, "platform_fee",
        "", f"Platform service fee for task: {data.get('product_name', '')}"
    )
    if fee_result is None:
        raise HTTPException(400, f"Insufficient credits for platform fee ({PLATFORM_SERVICE_FEE} pts)")

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

    # 加急任务：自动运行匹配引擎
    matched = []
    if task_type == "urgent":
        results = match_kocs_for_task(task, count=koc_required, buffer=3)
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
                "tracking_number": "",
                "content_urls": [],
                "content_data": {},
                "pledge_paid": False,
                "commission_paid": False,
                "reject_count": 0,
                "match_score": r["score"],
            })
        task_store.update(task.id, {"koc_slots": slots, "task_status": "assigned"})
        matched = [{"koc_id": s["koc_id"], "slot_index": i, "match_score": s["match_score"]}
                    for i, s in enumerate(slots)]

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
                    result.append({
                        "task": t.model_dump(),
                        "my_slot_index": i,
                        "my_slot": slot,
                    })
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
    # 补全产品的返佣链接
    if task.product_id:
        product = product_store.get(task.product_id)
        if product:
            result["commission_link"] = product.commission_link
            result["commission_type"] = product.commission_type
            result["commission_value"] = product.commission_value
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

    # 扣 KOC 质押点
    if task.pledge_koc > 0:
        koc_uid = _get_koc_user_id(koc_id)
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
# 商家发货
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/ship")
def ship_task(task_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """商家上传物流单号，扣商家质押点"""
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

    # 更新所有 accepted slot 的 shipped_at
    for i, slot in enumerate(task.koc_slots):
        if slot.get("status") == "accepted":
            task_store.update_slot(task_id, i, {"status": "shipped", "shipped_at": now})

    return {"status": "shipped", "task_id": task_id, "tracking_number": tracking_number, "shipped_at": now}


# ═══════════════════════════════════════════
# KOC 确认收货
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/receive/{slot_index}")
def receive_task(task_id: str, slot_index: int, current_user: dict = Depends(get_current_user)):
    """KOC 确认收到样品"""
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

    now = datetime.utcnow().isoformat()
    task_store.update_slot(task_id, slot_index, {"status": "received", "received_at": now})

    # 如果所有 shipped slot 都已 received → 进入 creating
    _sync_task_status(task_id)

    return {"status": "received", "task_id": task_id, "slot_index": slot_index, "received_at": now}


# ═══════════════════════════════════════════
# KOC 提交内容
# ═══════════════════════════════════════════

@router.put("/tasks/{task_id}/submit/{slot_index}")
def submit_content(task_id: str, slot_index: int, data: dict, current_user: dict = Depends(get_current_user)):
    """KOC 提交内容链接 → 自动完成 → 释放质押 + 结算佣金"""
    if current_user.get("role") not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC can submit content")

    task = task_store.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    slot = task_store.get_slot(task_id, slot_index)
    if not slot:
        raise HTTPException(404, f"Slot {slot_index} not found")

    if slot.get("status") not in ("received", "creating"):
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

    now = datetime.utcnow().isoformat()

    # 更新 slot 为 submitted
    task_store.update_slot(task_id, slot_index, {
        "status": "submitted",
        "submitted_at": now,
        "content_urls": content_urls,
    })

    # ── 自动完成：释放质押 + 结算佣金 ──
    koc_uid = _get_koc_user_id(koc_id)

    # 退 KOC 质押
    if task.pledge_koc > 0 and slot.get("pledge_paid"):
        credit_store.add_credits(koc_uid, task.pledge_koc, "pledge_return_koc",
                                 task_id, f"Pledge returned for: {task.product_name}")

    # 退商家质押
    if task.pledge_merchant > 0:
        m_uid = _get_merchant_user_id(task.merchant_id)
        credit_store.add_credits(m_uid, task.pledge_merchant, "pledge_return_merchant",
                                 task_id, f"Pledge returned for: {task.product_name}")

    # 结算佣金（如果还没结）
    if task.commission > 0 and not slot.get("commission_paid"):
        credit_store.add_credits(koc_uid, task.commission, "task_commission",
                                 task_id, f"Commission for: {task.product_name}")
        task_store.update_slot(task_id, slot_index, {"commission_paid": True})

    # 更新 KOC 统计
    koc = koc_store.get(koc_id)
    if koc:
        koc_store.update(koc_id, {
            "completed_tasks": koc.completed_tasks + 1,
            "total_collaborations": koc.total_collaborations + 1,
        })

    # 更新商家统计
    m = merchant_store.get(task.merchant_id)
    if m:
        merchant_store.update(task.merchant_id, {
            "total_collaborations": m.total_collaborations + 1,
            "total_tasks_completed": m.total_tasks_completed + 1,
        })

    # 同步 task 整体状态
    _sync_task_status(task_id)

    # 任务下的内容链接追加到 task 级别
    all_content_urls = list(task.content_urls)
    for url in content_urls:
        if url not in all_content_urls:
            all_content_urls.append(url)
    task_store.update(task_id, {"content_urls": all_content_urls})

    return {
        "status": "submitted",
        "task_id": task_id,
        "slot_index": slot_index,
        "submitted_at": now,
        "pledge_returned_koc": task.pledge_koc,
        "pledge_returned_merchant": task.pledge_merchant,
        "commission_paid": task.commission,
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
    """根据 slot 状态同步 task 整体状态"""
    task = task_store.get(task_id)
    if not task:
        return

    slots = task.koc_slots
    if not slots:
        return

    statuses = [s.get("status", "unknown") for s in slots]

    if all(s == "submitted" for s in statuses):
        task_store.update(task_id, {"task_status": "completed"})
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
