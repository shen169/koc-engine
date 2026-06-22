"""物流追踪服务 — 自动查询承运商物流状态，触发自动收货

支持承运商：
- FedEx, DHL, USPS, UPS（国际四大）
- SF-Express（顺丰国际）
- Amazon Logistics（亚马逊物流）
- 其他（通过 17TRACK 等聚合 API 兜底）

架构：
- 每个承运商有独立的 checker 函数
- `check_tracking()` 统一入口，按 carrier 路由
- `run_daily_tracking_check()` — cron 调用，扫描所有 shipped slot 并更新
- 状态映射：carrier delivered → slot received（自动收货）
"""

import re
import json
import hashlib
import time
from datetime import datetime
from typing import Optional
import httpx

from config import OUTPUT_DIR

# ═══════════════════════════════════════════
# 承运商追踪 URL 模板
# ═══════════════════════════════════════════

CARRIER_TRACKING_URLS = {
    "fedex": "https://www.fedex.com/fedextrack/?trknbr={tracking}",
    "dhl": "https://www.dhl.com/en/express/tracking.html?AWB={tracking}",
    "usps": "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}",
    "ups": "https://www.ups.com/track?track=yes&trackNums={tracking}",
    "sf-express": "https://www.sf-express.com/we/ew/waybill/waybill-detail/{tracking}",
    "sfexpress": "https://www.sf-express.com/we/ew/waybill/waybill-detail/{tracking}",
    "sf": "https://www.sf-express.com/we/ew/waybill/waybill-detail/{tracking}",
    "amazon-logistics": "https://track.amazon.com/tracking/{tracking}",
    "amazon": "https://track.amazon.com/tracking/{tracking}",
    "yunexpress": "https://www.yuntrack.com/track?trackingNumber={tracking}",
    "4px": "https://track.4px.com/track?trackingNumber={tracking}",
}

# 承运商 API endpoint（支持 JSON 响应的优先用这些）
CARRIER_APIS = {
    "fedex": "https://www.fedex.com/trackingCal/track?data={{\"TrackPackagesRequest\":{{\"trackingInfoList\":[{{\"trackNumberInfo\":{{\"trackingNumber\":\"{tracking}\"}}}}]}}}}",
    "dhl": "https://api-eu.dhl.com/track/shipments?trackingNumber={tracking}",
    "17track": "https://api.17track.net/track/v2.2/register",
}


# ═══════════════════════════════════════════
# 状态解析（承运商状态 → 统一状态）
# ═══════════════════════════════════════════

# 各承运商「已送达」关键词
DELIVERED_KEYWORDS = [
    "delivered", "已签收", "已送达", "签收", "delivery completed",
    "delivered - signed", "package delivered", "entregado",
    "配達完了", "배달 완료", "妥投", "已投递",
    "delivery successful", "successfully delivered",
]

IN_TRANSIT_KEYWORDS = [
    "in transit", "运输中", "运送中", "in transito",
    "out for delivery", "派送中", "配送中", "out for",
    "departed", "已发出", "已发车", "arrived at",
    "到达", "已到达", "at delivery", "on the way",
    "shipment picked up", "已揽收", "已取件",
    "customs clearance", "清关中", "通关中",
]

EXCEPTION_KEYWORDS = [
    "exception", "异常", "returned", "退回", "undeliverable",
    "无法投递", "投递失败", "delivery failed", "failed",
    "damaged", "破损", "丢失", "lost",
]


def _normalize_carrier(carrier: str) -> str:
    """统一承运商名称"""
    c = carrier.lower().strip().replace(" ", "-").replace("_", "-")
    # 别名映射
    aliases = {
        "sf": "sf-express",
        "sfexpress": "sf-express",
        "顺丰": "sf-express",
        "amazon": "amazon-logistics",
        "fedex": "fedex",
        "dhl": "dhl",
        "usps": "usps",
        "ups": "ups",
        "yunexpress": "yunexpress",
        "4px": "4px",
    }
    return aliases.get(c, c)


def _parse_status(text: str) -> str:
    """从追踪结果文本解析物流状态 → delivered | in_transit | pending | exception | unknown"""
    lower = text.lower()
    for kw in DELIVERED_KEYWORDS:
        if kw.lower() in lower:
            return "delivered"
    for kw in EXCEPTION_KEYWORDS:
        if kw.lower() in lower:
            return "exception"
    for kw in IN_TRANSIT_KEYWORDS:
        if kw.lower() in lower:
            return "in_transit"
    return "unknown"


def _build_display_url(tracking_number: str, carrier: str) -> str:
    """生成承运商追踪页面链接（给用户点击查看）"""
    normalized = _normalize_carrier(carrier)
    template = CARRIER_TRACKING_URLS.get(normalized, "")
    if template:
        return template.format(tracking=tracking_number)
    return f"https://www.17track.net/en/track?nums={tracking_number}"


# ═══════════════════════════════════════════
# 承运商 API 查询
# ═══════════════════════════════════════════

async def _query_fedex(tracking_number: str) -> dict:
    """FedEx 追踪查询"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"https://www.fedex.com/trackingCal/track"
            payload = {
                "TrackPackagesRequest": {
                    "trackingInfoList": [{
                        "trackNumberInfo": {"trackingNumber": tracking_number}
                    }]
                }
            }
            resp = await client.post(url, json=payload, headers={
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; KOC-Engine/2.0)",
            })
            if resp.status_code == 200:
                data = resp.json()
                return _parse_fedex_response(data)
    except Exception:
        pass
    return {"status": "unknown", "raw": "", "error": "FedEx API unavailable"}


def _parse_fedex_response(data: dict) -> dict:
    """解析 FedEx API 响应"""
    try:
        packages = data.get("TrackPackagesResponse", {}).get("packageList", [])
        if not packages:
            return {"status": "not_found", "raw": str(data)[:500]}
        pkg = packages[0]
        status_code = pkg.get("displayActSumyCnd", "")
        status_map = {
            "Delivered": "delivered",
            "Out for delivery": "in_transit",
            "In transit": "in_transit",
            "Picked up": "in_transit",
            "Shipment exception": "exception",
        }
        status = status_map.get(status_code, _parse_status(status_code))
        events = pkg.get("scanEventList", [])
        latest = events[0].get("status", "") if events else ""
        return {
            "status": status,
            "raw": f"FedEx: {status_code}",
            "latest_event": latest,
            "events": len(events),
        }
    except Exception as e:
        return {"status": "unknown", "raw": str(data)[:500], "error": str(e)}


async def _query_dhl(tracking_number: str) -> dict:
    """DHL Express 追踪查询"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"https://api-eu.dhl.com/track/shipments?trackingNumber={tracking_number}"
            # DHL API 需要 API key，尝试公开端点
            resp = await client.get(url, headers={
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; KOC-Engine/2.0)",
            })
            if resp.status_code == 200:
                data = resp.json()
                return _parse_dhl_response(data)
            elif resp.status_code == 401:
                # 回退到网页解析
                return await _query_web_fallback(tracking_number, "dhl")
    except Exception:
        pass
    return await _query_web_fallback(tracking_number, "dhl")


def _parse_dhl_response(data: dict) -> dict:
    try:
        shipments = data.get("shipments", [])
        if not shipments:
            return {"status": "not_found", "raw": str(data)[:500]}
        s = shipments[0]
        status_code = s.get("status", {}).get("statusCode", "")
        status_map = {
            "delivered": "delivered",
            "transit": "in_transit",
            "pre-transit": "pending",
            "failure": "exception",
        }
        return {
            "status": status_map.get(status_code, "unknown"),
            "raw": f"DHL: {status_code}",
            "location": s.get("status", {}).get("location", {}).get("address", {}).get("addressLocality", ""),
        }
    except Exception as e:
        return {"status": "unknown", "raw": str(data)[:500], "error": str(e)}


async def _query_web_fallback(tracking_number: str, carrier: str) -> dict:
    """通用网页解析兜底 — 获取承运商追踪页面 HTML 并解析状态"""
    try:
        url = _build_display_url(tracking_number, carrier)
        if not url:
            return {"status": "unknown", "raw": "", "error": f"No tracking URL for carrier: {carrier}"}

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml",
            }, follow_redirects=True)

            if resp.status_code != 200:
                return {"status": "unknown", "raw": "", "error": f"HTTP {resp.status_code}"}

            text = resp.text
            # 提取可见文本（简单去标签）
            visible = re.sub(r'<[^>]+>', ' ', text)
            visible = re.sub(r'\s+', ' ', visible).strip()

            status = _parse_status(visible)

            return {
                "status": status,
                "raw": visible[:1000],
                "url": url,
            }
    except Exception as e:
        return {"status": "unknown", "raw": "", "error": str(e)}


async def _query_17track(tracking_number: str, carrier: str) -> dict:
    """17TRACK API 查询（需 API key，兜底方案）"""
    # 17TRACK 需要注册获取 API key，默认回退到网页
    # 如果配置了 17TRACK_API_KEY 则使用 API
    import os
    api_key = os.getenv("17TRACK_API_KEY", "")
    if not api_key:
        return {"status": "unknown", "raw": "", "error": "No 17TRACK API key configured"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.17track.net/track/v2.2/register",
                json=[{"number": tracking_number, "carrier": _normalize_carrier(carrier)}],
                headers={
                    "17token": api_key,
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == 0:
                    track_data = data.get("data", {}).get("accepted", [{}])[0]
                    track_info = track_data.get("track_info", {})
                    latest = track_info.get("latest_status", {}).get("status", "")
                    return {
                        "status": _parse_status(latest),
                        "raw": f"17TRACK: {latest}",
                        "latest_event": latest,
                    }
    except Exception:
        pass
    return {"status": "unknown", "raw": "", "error": "17TRACK API error"}


# ═══════════════════════════════════════════
# 统一查询入口
# ═══════════════════════════════════════════

async def check_tracking(tracking_number: str, carrier: str = "") -> dict:
    """查询单个物流单号状态

    Returns:
        {
            status: "delivered" | "in_transit" | "pending" | "exception" | "not_found" | "unknown",
            carrier: str,
            tracking_number: str,
            display_url: str,  # 给用户点击查看的追踪链接
            raw: str,          # 原始追踪信息摘要
            checked_at: str,
        }
    """
    normalized = _normalize_carrier(carrier) if carrier else ""
    now = datetime.utcnow().isoformat()

    result = {
        "tracking_number": tracking_number,
        "carrier": carrier,
        "display_url": _build_display_url(tracking_number, carrier),
        "checked_at": now,
        "status": "unknown",
        "raw": "",
    }

    # ── 按承运商路由 ──
    query_map = {
        "fedex": _query_fedex,
        "dhl": _query_dhl,
    }

    if normalized in query_map:
        carrier_result = await query_map[normalized](tracking_number)
        result.update(carrier_result)
        return result

    # ── 其他承运商：网页解析兜底 ──
    web_result = await _query_web_fallback(tracking_number, carrier)
    result.update(web_result)
    return result


def check_tracking_sync(tracking_number: str, carrier: str = "") -> dict:
    """同步封装的追踪查询（供 cron 使用）。

    使用 asyncio.run() 在新线程中运行，避免与 FastAPI 主事件循环冲突。
    """
    import asyncio
    import concurrent.futures
    try:
        # Detect if there's a running event loop (e.g., inside FastAPI/uvicorn)
        asyncio.get_running_loop()
        # Running loop detected — run in a separate thread with its own loop
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(asyncio.run, check_tracking(tracking_number, carrier))
            return future.result(timeout=30)
    except RuntimeError:
        # No running loop — safe to use asyncio.run directly
        return asyncio.run(check_tracking(tracking_number, carrier))


# ═══════════════════════════════════════════
# 缓存（避免频繁查询同一单号）
# ═══════════════════════════════════════════

_tracking_cache: dict[str, dict] = {}

CACHE_TTL_SECONDS = {
    "delivered": 86400,    # 已送达：缓存 24 小时
    "exception": 21600,    # 异常：缓存 6 小时
    "in_transit": 14400,   # 运输中：缓存 4 小时
    "pending": 7200,       # 待揽收：缓存 2 小时
    "unknown": 3600,       # 未知：缓存 1 小时
    "not_found": 86400,    # 不存在：缓存 24 小时
}


def _cache_key(tracking_number: str) -> str:
    return hashlib.md5(f"{tracking_number}".encode()).hexdigest()[:16]


async def check_tracking_cached(tracking_number: str, carrier: str = "") -> dict:
    """带缓存的追踪查询"""
    key = _cache_key(tracking_number)
    cached = _tracking_cache.get(key)
    if cached:
        ttl = CACHE_TTL_SECONDS.get(cached.get("status", "unknown"), 3600)
        if time.time() - cached.get("checked_ts", 0) < ttl:
            return cached

    result = await check_tracking(tracking_number, carrier)
    result["checked_ts"] = time.time()
    _tracking_cache[key] = result
    return result


# ═══════════════════════════════════════════
# Cron 集成：每日扫描所有 shipped slot
# ═══════════════════════════════════════════

async def run_daily_tracking_check() -> dict:
    """扫描所有 status=shipped 的 slot，检查物流状态，自动标记已送达。

    Returns:
        {
            total_checked: int,
            auto_received: int,
            exceptions: int,
            details: [{task_id, slot_index, tracking, carrier, old_status, new_status}]
        }
    """
    from stores.task_store import task_store
    from stores.koc_store import koc_store

    now = datetime.utcnow().isoformat()
    result = {
        "total_checked": 0,
        "auto_received": 0,
        "exceptions": 0,
        "in_transit": 0,
        "details": [],
    }

    active_tasks = task_store.list_active()
    for task in active_tasks:
        for i, slot in enumerate(task.koc_slots):
            if slot.get("status") != "shipped":
                continue

            tracking_number = slot.get("tracking_number", "")
            carrier = slot.get("carrier", "")
            koc_id = slot.get("koc_id", "")

            if not tracking_number:
                continue

            result["total_checked"] += 1

            # 查询物流状态
            track_result = await check_tracking_cached(tracking_number, carrier)
            status = track_result.get("status", "unknown")

            detail = {
                "task_id": task.id,
                "product_name": task.product_name,
                "slot_index": i,
                "koc_id": koc_id[:8] if koc_id else "-",
                "tracking": tracking_number,
                "carrier": carrier,
                "tracking_status": status,
                "display_url": track_result.get("display_url", ""),
            }

            if status == "delivered":
                # 自动确认收货
                task_store.update_slot(task.id, i, {
                    "status": "received",
                    "received_at": now,
                    "receipt_notes": f"Auto-received via carrier tracking: {tracking_number} ({carrier})",
                })
                result["auto_received"] += 1
                detail["action"] = "auto_received"
            elif status == "exception":
                result["exceptions"] += 1
                detail["action"] = "exception_logged"
            else:
                result["in_transit"] += 1
                detail["action"] = "still_in_transit"

            result["details"].append(detail)

    return result


def run_daily_tracking_check_sync() -> dict:
    """同步封装（供 cron 同步调用）。

    使用 asyncio.run() 在新线程中运行，避免与 FastAPI 主事件循环冲突。
    """
    import asyncio
    import concurrent.futures
    try:
        asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(asyncio.run, run_daily_tracking_check())
            return future.result(timeout=120)
    except RuntimeError:
        return asyncio.run(run_daily_tracking_check())
