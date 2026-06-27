"""内容数据抓取服务 — Apify 爬虫自动抓取 KOC 提交的社交平台链接

架构（简化版）：
- KOC 提交内容只提交 URL，不提交自报数据
- 系统 24h 后自动触发 Apify 抓取真实表现数据
- 抓取数据直接写入 slot.content_data，作为唯一真实数据源
- 作者验证：抓取的 handle 必须匹配 KOC 本人

抓取时机：KOC 提交内容后 24 小时（给内容自然起量窗口期）
"""

from datetime import datetime
from urllib.parse import urlparse

import httpx

from config import APIFY_API_TOKEN, SCRAPE_DELAY_HOURS

# ═══════════════════════════════════════════
# Apify Actor 映射（域名 → Apify Actor ID）
# ═══════════════════════════════════════════

APIFY_BASE = "https://api.apify.com/v2"

# Actor ID 来自 Apify Store 搜索验证结果
ACTOR_MAP = {
    "tiktok.com": {
        "actor_id": "GdWCkxBtKWOsKjdch",
        "actor_name": "clockworks/tiktok-scraper",
        "input_builder": lambda url: {"startUrls": [{"url": url}], "maxItems": 1},
    },
    "instagram.com": {
        "actor_id": "shu8hvrXbJbY3Eb9W",
        "actor_name": "apify/instagram-scraper",
        "input_builder": lambda url: {"directUrls": [url], "resultsLimit": 1},
    },
    "youtube.com": {
        "actor_id": "y1IMcEPawMQPafm02",
        "actor_name": "epctex/youtube-video-downloader",
        "input_builder": lambda url: {"startUrls": [{"url": url}], "maxResults": 1},
    },
    "youtu.be": {
        "actor_id": "y1IMcEPawMQPafm02",
        "actor_name": "epctex/youtube-video-downloader",
        "input_builder": lambda url: {"startUrls": [{"url": url}], "maxResults": 1},
    },
    "facebook.com": {
        "actor_id": "KoJrdxJCTtpon81KY",
        "actor_name": "apify/facebook-posts-scraper",
        "input_builder": lambda url: {"startUrls": [{"url": url}], "maxPosts": 1},
    },
    "pinterest.com": {
        "actor_id": "tseqJicQpIxyFdHNB",
        "actor_name": "fatihtahta/pinterest-scraper-search",
        "input_builder": lambda url: {"startUrls": [{"url": url}], "maxItems": 1},
    },
}


def _detect_platform(url: str) -> str:
    """从 URL 提取域名 → 返回平台标识"""
    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower().replace("www.", "")
        for domain in ACTOR_MAP:
            if hostname == domain or hostname.endswith("." + domain):
                return domain
        return "unknown"
    except Exception:
        return "unknown"


def _build_headers() -> dict:
    return {
        "Authorization": f"Bearer {APIFY_API_TOKEN}",
        "Content-Type": "application/json",
    }


# ═══════════════════════════════════════════
# 1. 触发 Apify 抓取
# ═══════════════════════════════════════════

def trigger_scrape(url: str, platform: str = "") -> dict:
    """调用 Apify Actor API 提交抓取任务。

    Returns:
        {run_id, status: "running"|"failed", dataset_id, actor, error, platform}
    """
    if not APIFY_API_TOKEN:
        return {"status": "failed", "error": "No APIFY_API_TOKEN configured", "run_id": "", "dataset_id": "", "actor": ""}

    detected = platform if platform else _detect_platform(url)
    actor_config = ACTOR_MAP.get(detected)

    if not actor_config:
        return {
            "status": "failed",
            "error": f"No Apify actor available for platform: {detected}",
            "run_id": "", "dataset_id": "", "actor": "",
            "platform": detected,
        }

    try:
        resp = httpx.post(
            f"{APIFY_BASE}/acts/{actor_config['actor_id']}/runs",
            headers=_build_headers(),
            json=actor_config["input_builder"](url),
            timeout=20,
        )

        if resp.status_code == 403 and "limit" in resp.text.lower():
            return {
                "status": "failed",
                "error": "Apify monthly usage limit exceeded — upgrade plan to resume scraping",
                "run_id": "", "dataset_id": "",
                "actor": actor_config["actor_name"],
                "platform": detected,
            }

        resp.raise_for_status()
        run_data = resp.json()
        run_id = run_data.get("data", {}).get("id", "")
        dataset_id = run_data.get("data", {}).get("defaultDatasetId", "")

        return {
            "run_id": run_id,
            "status": "running",
            "dataset_id": dataset_id,
            "actor": actor_config["actor_name"],
            "error": "",
            "platform": detected,
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)[:500],
            "run_id": "", "dataset_id": "",
            "actor": actor_config.get("actor_name", "unknown"),
            "platform": detected,
        }


# ═══════════════════════════════════════════
# 2. 轮询 Apify run 状态 + 拉取结果
# ═══════════════════════════════════════════

def check_scrape_result(run_id: str, dataset_id: str = "") -> dict | None:
    """轮询 Apify run 状态，完成后拉取 dataset。

    Returns:
        {views, likes, comments, shares, saves,
         author_handle, post_exists, published_at,
         platform, scraped_at, engagement_rate, error}
        None = run 还在运行中
    """
    if not APIFY_API_TOKEN or not run_id:
        return None

    try:
        resp = httpx.get(
            f"{APIFY_BASE}/acts/~/runs/{run_id}",
            headers=_build_headers(),
            timeout=15,
        )

        if resp.status_code != 200:
            return None

        run_data = resp.json()
        status = run_data.get("data", {}).get("status", "RUNNING")

        if status in ("READY", "RUNNING"):
            return None

        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
            return {
                "views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0,
                "author_handle": "", "post_exists": False, "published_at": "",
                "platform": "", "scraped_at": datetime.utcnow().isoformat(),
                "engagement_rate": 0.0, "error": f"Apify run {status}",
            }

        # SUCCEEDED → 拉取 dataset
        ds_id = dataset_id or run_data.get("data", {}).get("defaultDatasetId", "")
        if not ds_id:
            return {
                "views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0,
                "author_handle": "", "post_exists": False, "published_at": "",
                "platform": "", "scraped_at": datetime.utcnow().isoformat(),
                "engagement_rate": 0.0, "error": "No dataset ID available",
            }

        resp = httpx.get(
            f"{APIFY_BASE}/datasets/{ds_id}/items?limit=1&format=json",
            headers=_build_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        items = resp.json()

        if not items or len(items) == 0:
            return {
                "views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0,
                "author_handle": "", "post_exists": False, "published_at": "",
                "platform": "", "scraped_at": datetime.utcnow().isoformat(),
                "engagement_rate": 0.0, "error": "Post not found or URL invalid",
            }

        raw = items[0]
        result = _normalize_scraped_result(raw)
        result["scraped_at"] = datetime.utcnow().isoformat()

        # 计算互动率
        if result["views"] > 0:
            engagement = (result["likes"] + result["comments"] +
                         result["shares"] + result["saves"])
            result["engagement_rate"] = round(engagement / result["views"] * 100, 1)
        else:
            result["engagement_rate"] = 0.0

        return result

    except Exception as e:
        return {
            "views": 0, "likes": 0, "comments": 0, "shares": 0, "saves": 0,
            "author_handle": "", "post_exists": False, "published_at": "",
            "platform": "", "scraped_at": datetime.utcnow().isoformat(),
            "engagement_rate": 0.0, "error": str(e)[:500],
        }


def _normalize_scraped_result(raw: dict) -> dict:
    """统一不同平台 Actor 的输出格式 → 标准 content_data dict"""
    # TikTok (clockworks/tiktok-scraper)
    if "playCount" in raw or "diggCount" in raw:
        return {
            "views": int(raw.get("playCount", 0)),
            "likes": int(raw.get("diggCount", 0)),
            "comments": int(raw.get("commentCount", 0)),
            "shares": int(raw.get("shareCount", 0)),
            "saves": 0,
            "clicks": 0,
            "conversions": 0,
            "revenue": 0.0,
            "author_handle": str(raw.get("authorMeta", {}).get("name", "")),
            "post_exists": True,
            "published_at": str(raw.get("createTimeISO", "") or raw.get("createTime", "")),
            "url": str(raw.get("webVideoUrl", "")),
            "platform": "tiktok",
        }

    # Instagram (apify/instagram-scraper)
    if "likesCount" in raw or "commentsCount" in raw:
        return {
            "views": int(raw.get("videoViewCount", 0)),
            "likes": int(raw.get("likesCount", 0)),
            "comments": int(raw.get("commentsCount", 0)),
            "shares": 0,
            "saves": 0,
            "clicks": 0,
            "conversions": 0,
            "revenue": 0.0,
            "author_handle": str(raw.get("ownerUsername", "") or raw.get("owner", {}).get("username", "")),
            "post_exists": True,
            "published_at": str(raw.get("timestamp", "")),
            "url": str(raw.get("url", "")),
            "platform": "instagram",
        }

    # YouTube (epctex/youtube-video-downloader)
    if "viewCount" in raw or "statistics" in raw:
        stats = raw.get("statistics", raw)
        snippet = raw.get("snippet", {})
        return {
            "views": int(stats.get("viewCount", 0)),
            "likes": int(stats.get("likeCount", 0)),
            "comments": int(stats.get("commentCount", 0)),
            "shares": 0,
            "saves": 0,
            "clicks": 0,
            "conversions": 0,
            "revenue": 0.0,
            "author_handle": str(snippet.get("channelTitle", "")),
            "post_exists": True,
            "published_at": str(snippet.get("publishedAt", "")),
            "url": str(raw.get("url", "")),
            "platform": "youtube",
        }

    # 通用 fallback
    return {
        "views": int(raw.get("views", 0) or raw.get("viewCount", 0) or 0),
        "likes": int(raw.get("likes", 0) or raw.get("likeCount", 0) or 0),
        "comments": int(raw.get("comments", 0) or raw.get("commentCount", 0) or 0),
        "shares": int(raw.get("shares", 0) or raw.get("shareCount", 0) or 0),
        "saves": int(raw.get("saves", 0) or raw.get("saveCount", 0) or 0),
        "clicks": int(raw.get("clicks", 0) or 0),
        "conversions": int(raw.get("conversions", 0) or 0),
        "revenue": float(raw.get("revenue", 0) or 0),
        "author_handle": str(raw.get("author_handle", "") or raw.get("author", "") or raw.get("username", "")),
        "post_exists": True,
        "published_at": str(raw.get("published_at", "") or raw.get("publishedAt", "")),
        "url": str(raw.get("url", "")),
        "platform": "unknown",
    }


# ═══════════════════════════════════════════
# 3. Cron 入口 — 扫描 + 抓取 + 写入 content_data
# ═══════════════════════════════════════════

def run_content_scrape_check_sync() -> dict:
    """同步扫描所有待抓取 slot：
    1. 找 status=submitted 且 submitted_at >= 24h 且未抓取过的 slot
    2. 触发 Apify 抓取
    3. 轮询 running 中的 run
    4. 完成后：抓取数据 → 直接写入 slot.content_data（作为唯一真实数据源）
    5. 作者不匹配 → 扣信任分 -30

    Returns:
        {triggered, completed, author_mismatches, errors}
    """
    from stores.task_store import task_store
    from stores.koc_store import koc_store
    from stores.merchant_store import merchant_store
    from stores.user_store import user_store
    from services.cron import sync_koc_tier
    from services.notifier import notify_user

    now = datetime.utcnow()
    result = {
        "triggered": 0,
        "completed": 0,
        "author_mismatches": 0,
        "errors": [],
    }

    active_tasks = task_store.list_active()
    for task in active_tasks:
        for i, slot in enumerate(task.koc_slots):
            if slot.get("status") != "submitted":
                continue

            koc_id = slot.get("koc_id", "")
            content_urls = slot.get("content_urls", [])
            if not content_urls:
                continue

            scraped_status = slot.get("scraped_status", "")
            submitted_at_str = slot.get("submitted_at", "")

            # ── 情况 1：未抓取过 + 已过 24h → 触发抓取 ──
            if scraped_status in ("", "failed"):
                try:
                    submitted_at = datetime.fromisoformat(submitted_at_str.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    continue

                hours_since_submit = (now - submitted_at).total_seconds() / 3600
                if hours_since_submit < SCRAPE_DELAY_HOURS:
                    continue

                primary_url = content_urls[0]
                scrape_run = trigger_scrape(primary_url, _detect_platform(primary_url))

                if scrape_run["status"] == "running":
                    task_store.update_slot(task.id, i, {
                        "scraped_status": "running",
                        "scraped_run_id": scrape_run["run_id"],
                    })
                    result["triggered"] += 1
                else:
                    # 抓取触发失败 → 记录尝试次数
                    attempts = slot.get("scrape_attempts", 0) + 1
                    _handle_scrape_failure(
                        task, i, koc_id, attempts,
                        scrape_run.get("error", "Unknown"),
                        task_store, koc_store, merchant_store, user_store,
                        sync_koc_tier, notify_user, result,
                    )

            # ── 情况 2：正在运行中 → 轮询结果 ──
            elif scraped_status == "running":
                run_id = slot.get("scraped_run_id", "")
                scraped_result = check_scrape_result(run_id)

                if scraped_result is None:
                    continue  # 还在运行中

                # ── 抓取完成但有错误（帖子被删/URL无效）→ 允许 KOC 修改一次 ──
                if scraped_result.get("error"):
                    attempts = slot.get("scrape_attempts", 0) + 1
                    _handle_scrape_failure(
                        task, i, koc_id, attempts,
                        scraped_result.get("error", "Scrape returned no data"),
                        task_store, koc_store, merchant_store, user_store,
                        sync_koc_tier, notify_user, result,
                    )
                    continue

                # 抓取成功 → 写入 content_data（唯一真实数据源）
                content_data = {
                    "views": scraped_result.get("views", 0),
                    "likes": scraped_result.get("likes", 0),
                    "comments": scraped_result.get("comments", 0),
                    "shares": scraped_result.get("shares", 0),
                    "saves": scraped_result.get("saves", 0),
                    "clicks": scraped_result.get("clicks", 0),
                    "conversions": scraped_result.get("conversions", 0),
                    "revenue": scraped_result.get("revenue", 0.0),
                    "engagement_rate": scraped_result.get("engagement_rate", 0.0),
                    "platform": scraped_result.get("platform", ""),
                    "last_updated": datetime.utcnow().isoformat(),
                }

                task_store.update_slot(task.id, i, {
                    "scraped_status": "done",
                    "scraped_data": scraped_result,
                    "content_data": content_data,
                })
                result["completed"] += 1

                # ── 作者验证 ──
                koc = koc_store.get(koc_id)
                if koc:
                    koc_handle = (koc.handle or koc.display_name or "").lower().strip()
                    scraped_handle = scraped_result.get("author_handle", "").lower().strip()

                    if scraped_handle and koc_handle and scraped_handle != koc_handle:
                        # 盗用他人内容 → 扣信任分
                        new_trust = max(0, koc.trust_score - 30)
                        koc_store.update(koc_id, {"trust_score": new_trust})
                        sync_koc_tier(koc_id)
                        result["author_mismatches"] += 1

                        # 通知 KOC
                        if koc.email:
                            koc_user = user_store.get_by_email(koc.email)
                            if koc_user:
                                notify_user(
                                    koc_user.id,
                                    "violation",
                                    "🚨 Content Author Mismatch Detected",
                                    f"{task.product_name}: The submitted content URL belongs to @{scraped_handle}, "
                                    f"not your account @{koc_handle}. Trust Score -30.",
                                    task_id=task.id,
                                    resource_path=f"/portal/tasks/{task.id}",
                                )

                        # 通知商家
                        m = merchant_store.get(task.merchant_id)
                        if m and m.user_id:
                            notify_user(
                                m.user_id,
                                "violation",
                                "🚨 Content Author Mismatch — KOC Penalized",
                                f"{task.product_name}: Platform detected the submitted content is from "
                                f"@{scraped_handle}, not the assigned KOC. KOC Trust Score -30.",
                                task_id=task.id,
                                resource_path=f"/dashboard/tasks/{task.id}",
                            )
                        continue  # author mismatch → don't notify "success"

                    # ── 抓取成功通知 ──
                    if koc.email:
                        koc_user = user_store.get_by_email(koc.email)
                        if koc_user:
                            notify_user(
                                koc_user.id,
                                "content_approved",
                                "📊 Content Data Verified",
                                f"{task.product_name}: Platform has verified your content performance. "
                                f"Views: {content_data['views']:,}, Likes: {content_data['likes']:,}, "
                                f"Engagement: {content_data['engagement_rate']}%",
                                task_id=task.id,
                                resource_path=f"/portal/tasks/{task.id}",
                            )

                        # 同步 KOC 综合表现分（内联计算，避免循环导入）
                        _sync_koc_perf_inline(koc_id)

    return result


def _handle_scrape_failure(task, slot_index: int, koc_id: str, attempts: int,
                           error_msg: str, task_store, koc_store, merchant_store,
                           user_store, sync_koc_tier, notify_user, result: dict):
    """处理抓取失败：记录尝试次数，1 次容错 → 第 2 次失败触发惩罚。

    流程：
    - 第 1 次失败（attempts=1）：通知 KOC 修改 URL 重新提交，给一次修改机会
    - 第 2 次失败（attempts=2）：KOC 违约，信任 -15，质押不退，通知双方
    """
    MAX_SCRAPE_ATTEMPTS = 2  # 最多 2 次抓取机会（初次 + 1 次修改）

    if attempts < MAX_SCRAPE_ATTEMPTS:
        # ── 还有修改机会 → 标记 failed，KOC 可重新提交 ──
        task_store.update_slot(task.id, slot_index, {
            "scraped_status": "failed",
            "scraped_run_id": "",
            "scrape_attempts": attempts,
        })

        # 通知 KOC：修改 URL
        koc = koc_store.get(koc_id)
        if koc and koc.email:
            koc_user = user_store.get_by_email(koc.email)
            if koc_user:
                notify_user(
                    koc_user.id,
                    "content_revision",
                    "⚠️ Content URL Scrape Failed — Please Resubmit",
                    f"{task.product_name}: Platform could not verify your content ({error_msg[:150]}). "
                    f"You have 1 chance to resubmit with a correct URL. "
                    f"Second failure = 10pt pledge forfeited + Trust Score -15.",
                    task_id=task.id,
                    resource_path=f"/portal/tasks/{task.id}",
                )

        # 通知商家
        m = merchant_store.get(task.merchant_id)
        if m and m.user_id:
            notify_user(
                m.user_id,
                "content_submitted",
                "⚠️ Content Verification Failed — Awaiting KOC Resubmission",
                f"{task.product_name}: Platform could not verify KOC's content URL. "
                f"KOC has been notified to resubmit a correct link. "
                f"Error: {error_msg[:150]}",
                task_id=task.id,
                resource_path=f"/dashboard/tasks/{task.id}",
            )

        result["errors"].append({
            "task_id": task.id,
            "slot_index": slot_index,
            "attempt": attempts,
            "error": error_msg,
        })

    else:
        # ── 第 2 次也失败 → KOC 违约 ──
        task_store.update_slot(task.id, slot_index, {
            "scraped_status": "failed",
            "scraped_run_id": "",
            "scrape_attempts": attempts,
            "pledge_paid": False,  # 质押没收
        })

        # 退还 commission 给商家 → bonus，不可提现
        if hasattr(task, 'commission') and task.commission > 0:
            from stores.credit_store import credit_store
            m_uid = ""
            m = merchant_store.get(task.merchant_id)
            if m:
                m_uid = m.user_id
            if m_uid:
                credit_store.add_credits(m_uid, task.commission, "commission_returned",
                                         task.id, f"Commission returned (scrape failed x2): {task.product_name}",
                                         withdrawable=False)

        # KOC 质押不退 → 给平台
        from stores.credit_store import credit_store
        credit_store.add_credits("platform", task.pledge_koc, "forfeited_pledge",
                                 task.id, f"KOC forfeited pledge (scrape failed x2): {task.product_name}")

        # 扣 KOC 信任分
        koc = koc_store.get(koc_id)
        if koc:
            koc_store.update(koc_id, {"trust_score": max(0, koc.trust_score - 15)})
            sync_koc_tier(koc_id)

        # 通知 KOC：违约
        if koc and koc.email:
            koc_user = user_store.get_by_email(koc.email)
            if koc_user:
                notify_user(
                    koc_user.id,
                    "violation",
                    "🚨 Content Verification Failed Twice — Pledge Forfeited",
                    f"{task.product_name}: Both scraping attempts failed. "
                    f"Your {task.pledge_koc}pt pledge has been forfeited and Trust Score -15. "
                    f"Error: {error_msg[:150]}",
                    task_id=task.id,
                    resource_path=f"/portal/tasks/{task.id}",
                )

        # 通知商家
        m = merchant_store.get(task.merchant_id)
        if m and m.user_id:
            notify_user(
                m.user_id,
                "violation",
                "🚨 KOC Content Verification Failed — Commission Refunded",
                f"{task.product_name}: KOC's content URL could not be verified after 2 attempts. "
                f"{task.commission}pt commission refunded. Error: {error_msg[:150]}",
                task_id=task.id,
                resource_path=f"/dashboard/tasks/{task.id}",
            )

        # 更新 task 状态
        from services.cron import _sync_task_disputed  # noqa — local import to avoid circular
        _sync_task_disputed(task.id)


def _sync_koc_perf_inline(koc_id: str):
    """内联版 _sync_koc_performance，避免 scraper → task_routes 循环导入"""
    import math
    from stores.task_store import task_store
    from stores.koc_store import koc_store
    all_tasks = task_store.list_by_koc(koc_id)
    total_engagement = 0
    total_posts = 0
    for t in all_tasks:
        for slot in t.koc_slots:
            if slot.get("koc_id") != koc_id:
                continue
            cd = slot.get("content_data", {})
            if not cd or not isinstance(cd, dict):
                continue
            v = cd.get("views", 0)
            if v <= 0:
                continue
            total_engagement += (cd.get("likes", 0) + cd.get("comments", 0) +
                                cd.get("shares", 0) + cd.get("saves", 0))
            total_posts += 1
    if total_posts > 0:
        avg_engagement = total_engagement / max(total_posts, 1)
        performance_score = min(100, round(math.log(avg_engagement + 1) * 15, 1))
    else:
        performance_score = 0.0
    koc_store.update(koc_id, {
        "performance_score": performance_score,
        "total_engagement": total_engagement,
        "total_content_posts": total_posts,
    })
