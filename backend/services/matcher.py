"""匹配引擎 — 自动为任务匹配 KOC"""

from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from stores.task_store import task_store
from models import KocTask, KocProfile


def match_kocs_for_task(task: KocTask, count: int, buffer: int = 3) -> list[dict]:
    """
    为任务匹配 KOC。
    返回: [{koc_id, score, reason}, ...] 按匹配分降序，含 buffer 余量。
    """
    all_kocs = koc_store.list_all({"status": "Approved"})

    eligible = []
    for koc in all_kocs:
        # 1. 排除黑名单
        if koc.is_blacklisted:
            continue

        # 2. 排除已在同任务中的
        already_slotted = any(
            s.get("koc_id") == koc.id and s.get("status") not in ("rejected", "timed_out")
            for s in task.koc_slots
        )
        if already_slotted:
            continue

        # 3. 排除有冲突任务（同 KOC 不能同时接太多加急）
        active_tasks = task_store.get_koc_active_tasks(koc.id)
        urgent_active = sum(1 for at in active_tasks if at["task"].get("task_type") == "urgent")
        if task.task_type == "urgent" and urgent_active >= 3:
            continue  # KOC 同时最多 3 个加急任务

        # 4. 计算匹配分
        score = _calc_match_score(koc, task)
        eligible.append({
            "koc_id": koc.id,
            "display_name": koc.display_name or f"Creator_{koc.id[:6]}",
            "tier": koc.tier,
            "niche_tags": koc.niche_tags,
            "score": score,
        })

    # 排序：匹配分降序
    eligible.sort(key=lambda x: x["score"], reverse=True)

    # 取 count + buffer
    return eligible[:count + buffer]


def rematch_slot(task: KocTask, slot_index: int) -> dict | None:
    """单个槽位重新匹配（KOC 拒绝/超时后调用）"""
    replaced = match_kocs_for_task(task, count=1, buffer=0)
    if not replaced:
        return None
    return replaced[0]


def _calc_match_score(koc: KocProfile, task: KocTask) -> float:
    """
    匹配分 = (KOC 分 × 0.55 + 商家分 × 0.45)
           × 品类匹配加成
           × 新人加成
           × 诚信系数
    """
    # ── KOC 分（0-100） ──
    koc_score = min(100, koc.score_total or 50)  # fallback 50

    # ── 商家分（0-100） ──
    merchant = merchant_store.get(task.merchant_id)
    if merchant:
        merchant_score = min(100, (merchant.avg_rating or 3.0) * 20)  # rating 5→100
    else:
        merchant_score = 50  # fallback

    base = koc_score * 0.55 + merchant_score * 0.45

    # ── 品类匹配加成 ──
    category_bonus = 1.0
    product_name_lower = task.product_name.lower()
    for tag in koc.niche_tags:
        if tag.lower() in product_name_lower:
            category_bonus = 1.5
            break
    else:
        # 部分匹配：品类是产品名的一部分
        if koc.niche_tags:
            for tag in koc.niche_tags:
                if len(tag) >= 3 and tag.lower()[:3] in product_name_lower:
                    category_bonus = 1.2
                    break

    # ── 新人加成（前 5 单 ×1.3） ──
    rookie_bonus = 1.3 if koc.completed_tasks < 5 else 1.0

    # ── 诚信系数 ──
    trust_coef = (merchant.trust_score / 100.0) if merchant else 1.0
    trust_coef = max(0.4, trust_coef)  # floor 0.4

    final_score = base * category_bonus * rookie_bonus * trust_coef

    return round(final_score, 2)
