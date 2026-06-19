"""Auto-matching engine — 规则引擎 + AI 增强匹配

为产品找 Top KOC，为 KOC 找 Top 产品。
规则引擎始终可用，AI 增强在 DeepSeek API 可用时提供语义级精排。
"""

import json
import math
import re
import httpx
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

# ── AI matching prompt ──────────────────────────────

MATCHING_PROMPT = """你是一个跨境电商 KOC 匹配专家。
请根据产品信息和 KOC 创作者资料，计算每个 KOC 与该产品的匹配度。

评分维度：
1. 品类匹配 (50%): 产品类别与 KOC 擅长领域是否重叠
2. 内容质量 (25%): KOC 的评分等级和粉丝互动质量
3. 商业潜力 (25%): KOC 的带货能力和历史合作表现

请严格输出 JSON，不要额外文字：
{"matches": [{"id": "koc_id或product_id", "score": 0-100, "reason": "简短匹配理由"}]}

按 score 降序排列。只返回前 N 个最匹配的结果。"""


# ── 工具函数 ────────────────────────────────────────

def _tokenize_category(category: str) -> set[str]:
    """将品类字符串拆成小写词集合。

    "Home & Kitchen" → {"home", "kitchen"}
    "skincare,beauty" → {"skincare", "beauty"}
    """
    if not category:
        return set()
    tokens = re.split(r'[&,/\s]+', category.lower().strip())
    return {t for t in tokens if t and len(t) > 1}


def _jaccard_similarity(tags_a: set[str], tags_b: set[str]) -> float:
    """Jaccard 相似度：交集大小 / 并集大小。"""
    if not tags_a or not tags_b:
        return 0.0
    intersection = tags_a & tags_b
    union = tags_a | tags_b
    return len(intersection) / len(union) if union else 0.0


def _tier_bonus(tier: str) -> float:
    """等级加成：L3=100, L2=70, L1=50, 其他=30。"""
    return {"L3": 100, "L2": 70, "L1": 50}.get(tier, 30)


def _region_match(product_target_market: str, koc_region: str) -> float:
    """地区模糊匹配。检查 product.target_market 与 KOC.region 的关联度。"""
    if not koc_region or not product_target_market:
        return 0.0
    pm_lower = product_target_market.lower()
    region_lower = koc_region.lower()

    # 直接包含
    if region_lower in pm_lower or pm_lower in region_lower:
        return 100.0

    # 地区关键词映射
    region_keywords = {
        "us": ["us", "usa", "america", "american", "united states"],
        "uk": ["uk", "britain", "british", "england", "united kingdom"],
        "ca": ["ca", "canada", "canadian"],
        "au": ["au", "australia", "australian"],
        "eu": ["eu", "europe", "european", "germany", "france", "italy", "spain", "netherlands"],
        "jp": ["jp", "japan", "japanese"],
        "kr": ["kr", "korea", "korean", "south korea"],
        "cn": ["cn", "china", "chinese"],
        "sea": ["sea", "southeast asia", "thailand", "vietnam", "indonesia", "philippines", "malaysia", "singapore"],
    }
    for _region, keywords in region_keywords.items():
        if any(kw in region_lower for kw in keywords):
            if any(kw in pm_lower for kw in keywords):
                return 100.0
    return 0.0


def _rule_score(koc: dict, product: dict) -> dict:
    """规则引擎五维打分。

    Returns:
        {match_score: float, dimensions: dict, reasons: list[str]}
    """
    reasons: list[str] = []
    dimensions: dict[str, float] = {}

    # 1. 品类匹配 (50%)
    product_tags = _tokenize_category(product.get("category", ""))
    koc_tags = set(tag.lower() for tag in (koc.get("niche_tags") or []))
    jaccard = _jaccard_similarity(product_tags, koc_tags)
    dim_niche = jaccard * 100.0
    dimensions["niche_match"] = round(dim_niche, 1)

    overlap_tags = product_tags & koc_tags
    if jaccard > 0.5:
        reasons.append(f"品类高度匹配({','.join(sorted(overlap_tags))})")
    elif jaccard > 0.2:
        reasons.append(f"品类部分匹配({','.join(sorted(overlap_tags))})")
    elif jaccard > 0:
        reasons.append(f"品类弱匹配({','.join(sorted(overlap_tags))})")
    else:
        reasons.append("品类无直接匹配")

    # 2. 等级加成 (20%)
    tier = koc.get("tier", "L1")
    dim_tier = _tier_bonus(tier)
    dimensions["tier_bonus"] = round(dim_tier, 1)
    tier_label = {"L3": "合伙人", "L2": "创作官", "L1": "体验官"}.get(tier, tier)
    reasons.append(f"{tier} {tier_label}")

    # 3. 综合评分 (15%)
    score_total = koc.get("score_total", 50)
    dim_score = min(100, max(0, score_total))
    dimensions["score_normalized"] = round(dim_score, 1)
    reasons.append(f"综合分 {score_total}/100")

    # 4. 地区匹配 (15%)
    dim_region = _region_match(product.get("target_market", ""), koc.get("region", ""))
    dimensions["region_match"] = round(dim_region, 1)
    if dim_region > 50:
        reasons.append(f"地区匹配({koc.get('region')})")

    # 5. 历史表现 (5%)
    avg_rating = koc.get("avg_rating", 0) or 0
    completed = koc.get("completed_tasks", 0) or 0
    rating_score = (avg_rating / 5.0) * 80.0
    volume_bonus = min(20, math.log(completed + 1) * 10)
    dim_history = rating_score + volume_bonus
    dimensions["history"] = round(dim_history, 1)
    if completed > 0:
        reasons.append(f"已完成 {completed} 次合作, 评分 {avg_rating:.1f}")

    # 6. 信任分 (5%) — 低信任分 KOC 明显降权
    trust = koc.get("trust_score", 100)
    dim_trust = trust  # 0-100 直接映射
    dimensions["trust_score"] = round(dim_trust, 1)
    if trust < 50:
        reasons.append(f"⚠️ 信任分较低({trust})")
    elif trust >= 90:
        reasons.append(f"信任分优秀({trust})")

    # 8. 内容表现 (5%) — KOC 历史内容表现力
    dim_performance = koc.get("performance_score", 0) or 0
    dimensions["content_performance"] = round(dim_performance, 1)
    if dim_performance >= 70:
        reasons.append(f"内容表现优秀({dim_performance})")
    elif dim_performance >= 40:
        reasons.append(f"内容表现良好({dim_performance})")

    # 7. 新品时效 (10%) — 24h 内上架 = 100，线性衰减到 7 天 = 0
    created_at = product.get("created_at", "")
    dim_recency = 0
    if created_at:
        try:
            from datetime import datetime, timezone
            now = datetime.utcnow()
            created_dt = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            age_hours = (now - created_dt.replace(tzinfo=None)).total_seconds() / 3600
            dim_recency = max(0, 100 * (1 - age_hours / 168))
        except (ValueError, AttributeError, TypeError):
            pass
    dimensions["recency"] = round(dim_recency, 1)
    if dim_recency >= 70:
        reasons.append(f"🆕 新品上架({round(age_hours)}h)")
    elif dim_recency >= 30:
        reasons.append(f"近期上架")

    # 加权总分（内容表现 5%，从品类匹配挤出）
    weights = {
        "niche_match": 0.35,
        "tier_bonus": 0.10,
        "score_normalized": 0.15,
        "region_match": 0.15,
        "history": 0.05,
        "trust_score": 0.05,
        "recency": 0.10,
        "content_performance": 0.05,
    }
    total = sum(dimensions[k] * weights[k] for k in weights)

    return {
        "match_score": round(total, 1),
        "dimensions": dimensions,
        "reasons": reasons,
    }


# ── AI 精排 ─────────────────────────────────────────

def _call_ai_match(system_prompt: str, user_content: str) -> list[dict]:
    """调用 DeepSeek API 做匹配精排。返回 parsed matches list。"""
    if not DEEPSEEK_API_KEY:
        return []

    try:
        resp = httpx.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()["choices"][0]["message"]["content"]
        scores = json.loads(result)

        if isinstance(scores, dict):
            matches = scores.get("matches", [])
        elif isinstance(scores, list):
            matches = scores
        else:
            return []

        return matches

    except Exception:
        return []


def _ai_match_products_for_koc(koc: dict, products: list[dict], top_n: int = 10) -> list[dict]:
    """AI 精排：为 KOC 匹配产品。"""
    if not DEEPSEEK_API_KEY or not products:
        return []

    koc_summary = (
        f"KOC 创作者:\n"
        f"- 擅长领域: {', '.join(koc.get('niche_tags', []))}\n"
        f"- 等级: {koc.get('tier', 'L1')}\n"
        f"- 平台: {koc.get('platform', '?')}\n"
        f"- 粉丝: {koc.get('follower_count', 0)}\n"
        f"- 地区: {koc.get('region', '?')}\n"
        f"- 综合评分: {koc.get('score_total', 0)}/100\n"
    )

    product_lines = []
    for p in products:
        line = (
            f"产品 ID: {p['id']} | "
            f"名称: {p.get('name', '?')} | "
            f"品类: {p.get('category', '?')} | "
            f"佣金: {p.get('commission_value', 'N/A')}"
        )
        product_lines.append(line)

    user_content = f"{koc_summary}\n─── 候选产品列表 ───\n" + "\n".join(product_lines) + \
        f"\n\n请为每个产品评分（0-100），选出最匹配该 KOC 的 {top_n} 个产品。"

    matches = _call_ai_match(MATCHING_PROMPT, user_content)
    return [{
        "product_id": m.get("id", m.get("product_id", "")),
        "score": max(0, min(100, int(m.get("score", 50)))),
        "reason": m.get("reason", ""),
    } for m in matches[:top_n]]


def _ai_match_kocs_for_product(product: dict, koc_candidates: list[dict], top_n: int = 10) -> list[dict]:
    """AI 精排：为产品匹配 KOC。"""
    if not DEEPSEEK_API_KEY or not koc_candidates:
        return []

    product_summary = (
        f"产品名称: {product.get('name', 'Unknown')}\n"
        f"品类: {product.get('category', 'General')}\n"
        f"描述: {product.get('description', '无')}\n"
        f"佣金: {product.get('commission_value', 'N/A')}\n"
    )

    koc_lines = []
    for k in koc_candidates:
        line = (
            f"KOC ID: {k['id']} | "
            f"平台: {k.get('platform', '?')} | "
            f"擅长: {', '.join(k.get('niche_tags', []))} | "
            f"等级: {k.get('tier', 'L1')} | "
            f"粉丝: {k.get('follower_count', 0)} | "
            f"地区: {k.get('region', '?')} | "
            f"评分: {k.get('score_total', 0)} | "
            f"合作: {k.get('completed_tasks', 0)}次 | "
            f"均分: {k.get('avg_rating', 0):.1f}"
        )
        koc_lines.append(line)

    user_content = f"{product_summary}\n─── 候选 KOC 列表 ───\n" + "\n".join(koc_lines) + \
        f"\n\n请为每个 KOC 评分（0-100），选出最匹配的 {top_n} 个。"

    matches = _call_ai_match(MATCHING_PROMPT, user_content)
    return [{
        "koc_id": m.get("id", m.get("koc_id", "")),
        "score": max(0, min(100, int(m.get("score", 50)))),
        "reason": m.get("reason", ""),
    } for m in matches[:top_n]]


# ── 公开 API ────────────────────────────────────────

APPROVED_STATUSES = {"Approved", "SampleSent", "Submitted", "Delivered", "Collaborating", "Upgraded"}


def match_kocs_for_product(
    product: dict,
    all_kocs: list[dict],
    top_n: int = 10,
    use_ai: bool = False,
    merchant_id: str = "",
) -> list[dict]:
    """为产品找 Top N 最匹配的 KOC。

    Args:
        product: product dict (from product_store)
        all_kocs: list of KOC dicts (from koc_store.list_pool or list_all)
        top_n: 返回前 N 个匹配
        use_ai: 是否启用 AI 精排
        merchant_id: 产品所属商家 ID，用于计算合作过加成

    Returns:
        list of match result dicts，按 match_score 降序
    """
    eligible = [
        k for k in all_kocs
        if k.get("status") in APPROVED_STATUSES
        and not k.get("is_blacklisted")
        and k.get("trust_score", 100) >= 30  # 信任分 <30 不参与匹配
    ]

    if not eligible:
        return []

    # ── 查询合作历史（KOC × 该商家）──
    past_collab_counts: dict[str, int] = {}
    past_collab_ratings: dict[str, float] = {}
    if merchant_id:
        try:
            from stores.task_store import task_store
            from stores.review_store import review_store
            merchant_tasks = task_store.list_by_merchant(merchant_id)
            for t in merchant_tasks:
                for slot in t.koc_slots:
                    kid = slot.get("koc_id", "")
                    if not kid:
                        continue
                    if slot.get("status") in ("approved", "completed"):
                        past_collab_counts[kid] = past_collab_counts.get(kid, 0) + 1
            # 查评价均分
            for kid in past_collab_counts:
                reviews = review_store.get_by_target(kid)
                merchant_reviews = [r for r in reviews if r.reviewer_id == merchant_id]
                if merchant_reviews:
                    past_collab_ratings[kid] = sum(r.rating for r in merchant_reviews) / len(merchant_reviews)
        except Exception:
            pass

    # Tier 1: 规则引擎初筛
    scored = []
    for koc in eligible:
        result = _rule_score(koc, product)
        koc_id = koc.get("id", "")

        # 合作过加成：同一商家 × 同一 KOC 的历史完成合作
        past_collabs = past_collab_counts.get(koc_id, 0)
        past_rating = past_collab_ratings.get(koc_id, 0)
        collab_bonus = 0.0
        if past_collabs > 0:
            # 基础加成：每次合作 +3 分，上限 15 分
            count_bonus = min(15.0, past_collabs * 3.0)
            # 评价加成：均分 ≥4.0 额外 +5
            rating_bonus = 5.0 if past_rating >= 4.0 else (2.0 if past_rating >= 3.0 else 0)
            collab_bonus = count_bonus + rating_bonus
            result["dimensions"]["past_collab_bonus"] = round(collab_bonus, 1)
            result["reasons"].append(f"🤝 合作过 {past_collabs} 次" + (f" (均分 {past_rating:.1f})" if past_rating > 0 else ""))
        else:
            result["dimensions"]["past_collab_bonus"] = 0.0

        # 总分 = 规则分 + 合作加成
        final_score = result["match_score"] + collab_bonus

        scored.append({
            "koc_id": koc_id,
            "display_name": koc.get("display_name") or f"Creator_{koc_id[:6]}",
            "tier": koc.get("tier", "L1"),
            "niche_tags": koc.get("niche_tags", []),
            "score_total": koc.get("score_total", 0),
            "follower_count": koc.get("follower_count", 0),
            "region": koc.get("region", ""),
            "avg_rating": koc.get("avg_rating", 0),
            "completed_tasks": koc.get("completed_tasks", 0),
            "past_collabs_with_merchant": past_collabs,
            "match_score": round(final_score, 1),
            "match_dimensions": result["dimensions"],
            "match_reasons": result["reasons"],
            "source": "rule",
        })

    scored.sort(key=lambda x: x["match_score"], reverse=True)

    # Tier 2: AI 精排（可选）
    if use_ai and DEEPSEEK_API_KEY:
        top_koc_ids = {s["koc_id"] for s in scored[:20]}
        ai_candidates = [k for k in eligible if k.get("id") in top_koc_ids]
        ai_results = _ai_match_kocs_for_product(product, ai_candidates, top_n)

        if ai_results:
            ai_scores = {r["koc_id"]: r for r in ai_results}
            for s in scored:
                ai_r = ai_scores.get(s["koc_id"])
                if ai_r:
                    s["match_score"] = ai_r["score"]
                    s["match_reasons"].insert(0, f"AI: {ai_r['reason']}")
                    s["source"] = "ai"
            scored.sort(key=lambda x: x["match_score"], reverse=True)

    return scored[:top_n]


def match_products_for_koc(
    koc: dict,
    all_products: list[dict],
    top_n: int = 10,
    use_ai: bool = False,
) -> list[dict]:
    """为 KOC 找 Top N 最匹配的产品。

    Args:
        koc: KOC profile dict
        all_products: list of product dicts
        top_n: 返回前 N 个匹配
        use_ai: 是否启用 AI 精排

    Returns:
        list of match result dicts，按 match_score 降序
    """
    active_products = [p for p in all_products if p.get("status") == "active"]
    if not active_products:
        return []

    scored = []
    for product in active_products:
        result = _rule_score(koc, product)
        scored.append({
            "product_id": product.get("id"),
            "product_name": product.get("name"),
            "product_category": product.get("category", ""),
            "commission_value": product.get("commission_value", ""),
            "commission_type": product.get("commission_type", "discount_code"),
            "image_url": product.get("image_url", ""),
            "description": product.get("description", ""),
            "merchant_id": product.get("merchant_id"),
            "match_score": result["match_score"],
            "match_dimensions": result["dimensions"],
            "match_reasons": result["reasons"],
            "source": "rule",
        })

    scored.sort(key=lambda x: x["match_score"], reverse=True)

    # AI 精排（可选）
    if use_ai and DEEPSEEK_API_KEY:
        top_product_ids = {s["product_id"] for s in scored[:20]}
        ai_candidates = [p for p in active_products if p.get("id") in top_product_ids]
        ai_results = _ai_match_products_for_koc(koc, ai_candidates, top_n)

        if ai_results:
            ai_scores = {r["product_id"]: r for r in ai_results}
            for s in scored:
                ai_r = ai_scores.get(s["product_id"])
                if ai_r:
                    s["match_score"] = ai_r["score"]
                    s["match_reasons"].insert(0, f"AI: {ai_r['reason']}")
                    s["source"] = "ai"
            scored.sort(key=lambda x: x["match_score"], reverse=True)

    return scored[:top_n]


# ── Task auto-fill (used by task_routes.py) ──────────

def match_kocs_for_task(task, count: int = 1, buffer: int = 3) -> list[dict]:
    """任务创建时自动匹配 KOC 填槽。

    供 task_routes.py 创建加急任务时调用。

    Args:
        task: KocTask 对象（含 product_id, product_name 等）
        count: 需要匹配的 KOC 数量
        buffer: 额外候选数量（= count + buffer 总返回量）

    Returns:
        [{koc_id, score}, ...]，按 score 降序
    """
    from stores.koc_store import koc_store
    from stores.product_store import product_store

    product = product_store.get(task.product_id)
    if not product:
        return []

    all_kocs = [k.model_dump() for k in koc_store.list_all()]
    matches = match_kocs_for_product(
        product.model_dump(),
        all_kocs,
        top_n=count + buffer,
        use_ai=False,
        merchant_id=task.merchant_id,
    )

    return [{"koc_id": m["koc_id"], "score": m["match_score"]} for m in matches]


def rematch_slot(task, slot_index: int) -> dict | None:
    """重新匹配单个 slot（排除已在其他 slot 的 KOC）。

    供 task_routes.py 的 force-rematch 和 cron rematch 调用。

    Args:
        task: KocTask 对象
        slot_index: 要重新匹配的 slot 索引

    Returns:
        {koc_id, score} 或 None（没有可用 KOC）
    """
    from stores.koc_store import koc_store
    from stores.product_store import product_store

    product = product_store.get(task.product_id)
    if not product:
        return None

    # 收集所有已被占用的 KOC ID（含当前 slot 旧 KOC，防止重复分配同一人）
    occupied_ids = set()
    for i, slot in enumerate(task.koc_slots or []):
        if slot.get("koc_id"):
            occupied_ids.add(slot["koc_id"])

    all_kocs = [k.model_dump() for k in koc_store.list_all()]
    # 过滤掉已被占用的 KOC
    available_kocs = [k for k in all_kocs if k.get("id") not in occupied_ids]

    matches = match_kocs_for_product(
        product.model_dump(),
        available_kocs,
        top_n=1,
        use_ai=False,
        merchant_id=task.merchant_id,
    )

    if not matches:
        return None

    return {"koc_id": matches[0]["koc_id"], "score": matches[0]["match_score"]}
