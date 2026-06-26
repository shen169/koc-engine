"""AI 内容审核服务 — DeepSeek v4 终审 KOC 提交内容"""

import json
import httpx
import re
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

JUDGE_PROMPT = """You are a neutral content compliance auditor for a KOC (Key Opinion Consumer) marketing platform.

Your job: review a KOC's content submission that has been rejected twice by the merchant, and make a FINAL binding judgment.

## Inputs you will receive:
- Product name, category, description
- KOC's content URLs (TikTok/YouTube/Instagram/etc.)
- KOC's self-reported performance data (views, likes, comments, shares, conversions, revenue)
- KOC's platform handle, follower count, historical performance score
- The two rejection reasons provided by the merchant
- Timeline: when KOC accepted the task, when they submitted

## Your judgment criteria:

1. **URL authenticity** (most important):
   - Check if the content URLs look like real platform links (tiktok.com/@xxx/video/123, youtube.com/watch?v=xxx, instagram.com/p/xxx, etc.)
   - Random-looking URLs, URL shorteners, or unrelated domains → suspicious
   - Missing URLs entirely → instant reject

2. **Performance data plausibility**:
   - A KOC with 1,000 followers claiming 100,000 views → suspicious (flag but don't reject on this alone)
   - Engagement rates (likes+comments+shares)/views > 20% → flag
   - Zero views with non-zero likes/comments → data fabrication

3. **Timeline consistency**:
   - Content should be published after task acceptance date
   - If submission happened suspiciously fast (within hours of acceptance) with high metrics → flag

4. **Merchant rejection pattern analysis**:
   - If both rejections are vague ("not good enough", "quality issues") without specifics → likely bad-faith merchant
   - If rejections point to concrete, verifiable issues → more credible
   - If merchant's reasons are contradictory between rejection 1 and 2 → suspicious

5. **KOC historical credibility**:
   - KOC with high performance_score and multiple completed tasks → more trustworthy
   - First-time KOC with suspicious data → lean toward reject
   - Known good KOC + vague merchant rejections → lean toward approve

## Decision thresholds:
- Clear evidence of fake URLs or fabricated data → **reject**
- Vague merchant rejections + real-looking URLs + plausible metrics → **approve**
- When uncertain, err on the side of protecting the party with better track record

## Output format (JSON only, no extra text):
{"verdict": "approve" or "reject", "reason": "brief explanation (max 200 chars)", "confidence": 0-100}"""


def judge_submission(
    product_name: str = "",
    product_category: str = "",
    product_description: str = "",
    content_urls: list = None,
    content_data: dict = None,
    merchant_rejection_reasons: list = None,
    koc_handle: str = "",
    koc_follower_count: int = 0,
    koc_performance_score: float = 0.0,
    koc_completed_tasks: int = 0,
    accepted_at: str = "",
    submitted_at: str = "",
) -> dict:
    """AI 终审 KOC 提交内容。无 API Key 时使用规则引擎 fallback。"""

    if not DEEPSEEK_API_KEY:
        return _rule_based_judge(
            content_urls=content_urls,
            content_data=content_data,
            merchant_rejection_reasons=merchant_rejection_reasons,
            koc_performance_score=koc_performance_score,
            koc_completed_tasks=koc_completed_tasks,
            koc_follower_count=koc_follower_count,
        )

    content_urls = content_urls or []
    content_data = content_data or {}
    merchant_rejection_reasons = merchant_rejection_reasons or []

    user_input = f"""## Product
Name: {product_name}
Category: {product_category}
Description: {product_description or 'N/A'}

## KOC Content Submission
URLs: {', '.join(content_urls) if content_urls else 'No URLs provided'}
Performance Data:
- Views: {content_data.get('views', 0):,}
- Likes: {content_data.get('likes', 0):,}
- Comments: {content_data.get('comments', 0):,}
- Shares: {content_data.get('shares', 0):,}
- Saves: {content_data.get('saves', 0):,}
- Clicks: {content_data.get('clicks', 0):,}
- Conversions: {content_data.get('conversions', 0):,}
- Revenue: ${content_data.get('revenue', 0):.2f}

## KOC Profile
Handle: @{koc_handle}
Followers: {koc_follower_count:,}
Performance Score: {koc_performance_score}/100
Completed Tasks: {koc_completed_tasks}

## Merchant Rejection History
Rejection 1: {merchant_rejection_reasons[0] if len(merchant_rejection_reasons) > 0 else 'N/A'}
Rejection 2: {merchant_rejection_reasons[1] if len(merchant_rejection_reasons) > 1 else 'N/A'}

## Timeline
Accepted: {accepted_at}
Submitted: {submitted_at}"""

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
                    {"role": "system", "content": JUDGE_PROMPT},
                    {"role": "user", "content": user_input},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()["choices"][0]["message"]["content"]
        judge = json.loads(result)
        return {
            "verdict": judge.get("verdict", "reject"),
            "reason": judge.get("reason", "")[:500],
            "confidence": min(100, max(0, int(judge.get("confidence", 50)))),
        }
    except Exception:
        return _rule_based_judge(
            content_urls=content_urls,
            content_data=content_data,
            merchant_rejection_reasons=merchant_rejection_reasons,
            koc_performance_score=koc_performance_score,
            koc_completed_tasks=koc_completed_tasks,
            koc_follower_count=koc_follower_count,
        )


def _rule_based_judge(
    content_urls: list = None,
    content_data: dict = None,
    merchant_rejection_reasons: list = None,
    koc_performance_score: float = 0.0,
    koc_completed_tasks: int = 0,
    koc_follower_count: int = 0,
) -> dict:
    """无 API Key 时的规则引擎 fallback。倾向保护高信誉方。"""
    content_urls = content_urls or []
    content_data = content_data or {}
    reasons = merchant_rejection_reasons or []

    # ── Red flags ──
    red_flags = 0
    flags_detail = []

    # 1. No URLs → instant reject
    if not content_urls:
        red_flags += 3
        flags_detail.append("No content URLs provided")

    # 2. URL pattern check
    valid_domains = ["tiktok.com", "youtube.com", "youtu.be", "instagram.com",
                     "facebook.com", "x.com", "twitter.com", "pinterest.com",
                     "snapchat.com", "linkedin.com", "twitch.tv"]
    valid_url_count = 0
    for url in content_urls:
        url_lower = url.lower()
        if any(d in url_lower for d in valid_domains):
            valid_url_count += 1
    if valid_url_count == 0 and content_urls:
        red_flags += 2
        flags_detail.append("URLs don't match known social platforms")

    # 3. Metrics plausibility
    followers_estimate = max(1000, koc_follower_count)  # floor at 1000 for tiny accounts
    views = content_data.get("views", 0)
    if views > 0:
        engagement = (content_data.get("likes", 0) + content_data.get("comments", 0) +
                      content_data.get("shares", 0) + content_data.get("saves", 0))
        engagement_rate = engagement / views * 100
        # Extremely high engagement (>25%) is suspicious for organic content
        if engagement_rate > 25:
            red_flags += 1
            flags_detail.append(f"Suspicious engagement rate: {engagement_rate:.1f}%")
        # Views > 100x follower count is suspicious
        if followers_estimate > 0 and views > followers_estimate * 100:
            red_flags += 1
            flags_detail.append(f"Views ({views:,}) far exceed typical reach for follower count")
    else:
        if content_data.get("likes", 0) > 0 or content_data.get("comments", 0) > 0:
            red_flags += 2
            flags_detail.append("Has engagement but zero views — likely fabricated")

    # 4. Vague merchant rejections → merchant is suspicious
    vague_keywords = ["not good", "quality", "not enough", "不满意", "不好", "不行", "不够"]
    vague_count = 0
    for r in reasons:
        r_lower = r.lower()
        if len(r) < 20:  # very short rejection
            vague_count += 1
        elif any(kw in r_lower for kw in vague_keywords) and len(r) < 100:
            vague_count += 1
    if vague_count >= 2:
        red_flags -= 1  # reduce red flags — merchant seems bad-faith

    # 5. KOC credibility
    if koc_completed_tasks >= 5 and koc_performance_score >= 50:
        red_flags -= 1  # trusted KOC
    elif koc_completed_tasks == 0 and koc_performance_score < 30:
        red_flags += 1  # untrusted first-timer

    # ── Decision ──
    if red_flags >= 2:
        return {
            "verdict": "reject",
            "reason": f"Rule engine: {red_flags} red flags — {'; '.join(flags_detail[:3])}"[:500],
            "confidence": min(90, 50 + red_flags * 10),
        }
    else:
        return {
            "verdict": "approve",
            "reason": f"Rule engine: no significant red flags ({red_flags}) — approving"[:500],
            "confidence": max(50, 80 - red_flags * 15),
        }
