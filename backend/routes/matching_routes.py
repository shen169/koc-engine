"""自动匹配路由 — 智能推荐 KOC-产品对"""

from fastapi import APIRouter, Depends, HTTPException, Query
from services.matcher import match_kocs_for_product, match_products_for_koc
from routes.interest_routes import auto_assign_koc_to_product
from stores.product_store import product_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from stores.interest_store import interest_store
from stores.user_store import user_store
from models import Interest
from auth import get_current_user, require_admin
from stores.task_store import task_store

router = APIRouter(tags=["matching"])


@router.post("/matching/product/{product_id}")
def find_kocs_for_product(
    product_id: str,
    top_n: int = Query(10, ge=1, le=50),
    use_ai: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    """为产品找最匹配的 KOC。

    鉴权：merchant（自己的产品）或 admin。
    返回按 match_score 降序排列的 KOC 列表，含匹配理由。
    """
    role = current_user.get("role")
    product = product_store.get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    # 商家只能给自己的产品匹配
    if role == "merchant":
        m = merchant_store.get_by_user_id(current_user["sub"])
        if not m or product.merchant_id != m.id:
            raise HTTPException(403, "Not your product")
    elif role not in ("admin",):
        raise HTTPException(403, "Only merchant and admin can match for products")

    # 获取全部 eligible KOC
    all_kocs = [k.model_dump() for k in koc_store.list_all()]

    matches = match_kocs_for_product(
        product.model_dump(),
        all_kocs,
        top_n=top_n,
        use_ai=use_ai,
        merchant_id=product.merchant_id,
    )

    return {
        "product_id": product_id,
        "product_name": product.name,
        "product_category": product.category,
        "matches_count": len(matches),
        "matches": matches,
    }


@router.get("/matching/koc")
def find_products_for_koc(
    top_n: int = Query(10, ge=1, le=50),
    use_ai: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    """为当前 KOC 找最匹配的产品。

    鉴权：koc 登录后自动从 token 反查 profile。
    返回按 match_score 降序排列的产品列表，含匹配理由。
    """
    role = current_user.get("role")
    if role not in ("koc", "admin"):
        raise HTTPException(403, "Only KOC and admin can get product recommendations")

    # 从 token 反查 KOC profile
    if role == "koc":
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        if not koc:
            raise HTTPException(404, "KOC profile not found — apply first")
    else:
        # admin 需要传 koc_id 参数，这里给 admin 返回 empty 提示
        raise HTTPException(400, "Admin must use query param koc_id or switch to KOC account")

    all_products = [p.model_dump() for p in product_store.list_all()]

    matches = match_products_for_koc(
        koc.model_dump(),
        all_products,
        top_n=top_n,
        use_ai=use_ai,
    )

    return {
        "koc_id": koc.id,
        "display_name": koc.display_name or f"Creator_{koc.id[:6]}",
        "niche_tags": koc.niche_tags,
        "matches_count": len(matches),
        "matches": matches,
    }


@router.get("/matching/koc/{koc_id}")
def find_products_for_koc_by_admin(
    koc_id: str,
    top_n: int = Query(10, ge=1, le=50),
    use_ai: bool = Query(False),
    current_user: dict = Depends(require_admin),
):
    """Admin 视角：为指定 KOC 找最匹配的产品。"""
    koc = koc_store.get(koc_id)
    if not koc:
        raise HTTPException(404, "KOC not found")

    all_products = [p.model_dump() for p in product_store.list_all()]

    matches = match_products_for_koc(
        koc.model_dump(),
        all_products,
        top_n=top_n,
        use_ai=use_ai,
    )

    return {
        "koc_id": koc.id,
        "display_name": koc.display_name or f"Creator_{koc.id[:6]}",
        "niche_tags": koc.niche_tags,
        "matches_count": len(matches),
        "matches": matches,
    }


@router.post("/matching/auto-interest")
def auto_express_interest(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """一键批量表达意向。

    Body:
        {product_id: str, koc_ids: [str, ...]}

    根据 role 自动判断方向：
    - merchant 对 koc_ids 表达意向（to_type=koc）
    - koc 对 product_id 表达意向（to_type=product）

    自动跳过已存在的意向记录（防重复）。
    """
    role = current_user.get("role")
    product_id = data.get("product_id", "")
    koc_ids = data.get("koc_ids", [])

    if not koc_ids:
        raise HTTPException(400, "koc_ids is required")

    created = []
    skipped = []
    auto_assigned = []

    if role == "merchant":
        # 验证产品属于该商家
        if product_id:
            product = product_store.get(product_id)
            if not product:
                raise HTTPException(404, "Product not found")
            m = merchant_store.get_by_user_id(current_user["sub"])
            if not m or product.merchant_id != m.id:
                raise HTTPException(403, "Not your product")

        for koc_id in koc_ids:
            # 检查是否已存在
            existing = interest_store.list_by_from(m.id, "merchant")
            already = any(
                i.to_id == koc_id and i.to_type == "koc" and i.status == "expressed"
                for i in existing
            )
            if already:
                skipped.append(koc_id)
                continue

            interest = Interest(
                from_role="merchant",
                from_id=m.id,
                to_id=koc_id,
                to_type="koc",
            )
            interest_store.create(interest)
            created.append(koc_id)

    elif role == "koc":
        # KOC 对产品表达意向 → 自动接单
        user = user_store.get_by_id(current_user["sub"])
        koc = koc_store.get_by_email(user.email) if user else None
        if not koc:
            raise HTTPException(404, "KOC profile not found — apply first")

        # 验证产品存在
        if product_id:
            product = product_store.get(product_id)
            if not product:
                raise HTTPException(404, "Product not found")

        # 活跃任务上限检查
        active_count = task_store.count_active_for_koc(koc.id)
        if active_count >= 5:
            raise HTTPException(400, f"You already have {active_count} active tasks (max 5). Complete some before expressing new interest.")

        existing = interest_store.list_by_from(koc.id, "koc")
        already = any(
            i.to_id == product_id and i.to_type == "product" and i.status == "expressed"
            for i in existing
        )
        if already:
            skipped.append(product_id)
        else:
            # V2: 先执行自动接单（可能抛异常，所以放在创建意向之前）
            assign_result = auto_assign_koc_to_product(koc.id, product_id)

            interest = Interest(
                from_role="koc",
                from_id=koc.id,
                to_id=product_id,
                to_type="product",
            )
            interest_store.create(interest)
            created.append(product_id)

            if assign_result:
                auto_assigned.append({
                    "product_id": product_id,
                    "task_id": assign_result["task_id"],
                    "slot_index": assign_result["slot_index"],
                    "action": assign_result["action"],
                })

    else:
        raise HTTPException(403, "Only KOC and merchant can express interest")

    result = {
        "created": created,
        "skipped": skipped,
        "total_created": len(created),
        "total_skipped": len(skipped),
    }
    if auto_assigned:
        result["auto_assigned"] = auto_assigned
    return result
