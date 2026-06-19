"""AI 三维评分服务 — DeepSeek v4 (OpenAI-compatible API)"""

import json
import httpx
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
from config import SCORE_THRESHOLD_REJECT, SCORE_THRESHOLD_L2, SCORE_THRESHOLD_L3

SCORING_PROMPT = """你是一个 KOC（微型意见领袖）质量评估专家。
请根据以下信息对该创作者进行三维评分：

1. 原生度 (Authenticity, 0-100): 实拍内容占比、真实分享语气、非营销号程度
2. 垂直度 (Niche Fit, 0-100): 内容关键词与目标品类的匹配度
3. 带货力 (Commerce Signal, 0-100): 评论区求购信号密度、粉丝互动质量

综合分 = 原生度×40% + 垂直度×30% + 带货力×30%
分级: >=80 L3(合伙人), >=65 L2(创作官), >=60 L1(体验官), <60 婉拒

请严格输出 JSON，不要额外文字：
{"authenticity": int, "niche": int, "engagement": int, "total": int, "tier": "L1/L2/L3", "reason": "简短理由"}"""


def score_application(handle: str, platform: str, video_links: list[str], niche: str = "general", profile_url: str = "", follower_count: int = 0) -> dict:
    """对 KOC 申请做三维评分。无 API Key 时返回模拟分数。"""

    if not DEEPSEEK_API_KEY:
        return _mock_score(handle, follower_count)

    user_content = f"""
创作者信息：
- 平台: {platform}
- 账号: {handle}
- 主页链接: {profile_url}
- 粉丝数: {follower_count:,}
- 目标品类: {niche}
- 过往内容链接: {', '.join(video_links) if video_links else '未提供'}
"""
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
                    {"role": "system", "content": SCORING_PROMPT},
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

        raw = {k: max(0, min(100, int(scores.get(k, 50)))) for k in ["authenticity", "niche", "engagement"]}
        total = int(raw["authenticity"] * 0.4 + raw["niche"] * 0.3 + raw["engagement"] * 0.3)

        if total >= SCORE_THRESHOLD_L3:
            tier = "L3"
        elif total >= SCORE_THRESHOLD_L2:
            tier = "L2"
        elif total >= SCORE_THRESHOLD_REJECT:
            tier = "L1"
        else:
            tier = "L1"

        return {
            "authenticity": raw["authenticity"],
            "niche": raw["niche"],
            "engagement": raw["engagement"],
            "total": total,
            "tier": tier,
            "reason": scores.get("reason", ""),
        }
    except Exception:
        return _mock_score(handle)


def _mock_score(handle: str, follower_count: int = 0) -> dict:
    """无 API Key 时的模拟评分"""
    import hashlib
    h = int(hashlib.md5(handle.encode()).hexdigest()[:8], 16)
    # 粉丝数越高，基础分略微上浮（cap at +10）
    follower_boost = min(10, follower_count // 10000) if follower_count > 0 else 0
    auth = min(100, 50 + (h % 40) + follower_boost)
    niche = min(100, 50 + ((h >> 4) % 40) + follower_boost)
    eng = min(100, 50 + ((h >> 8) % 40) + follower_boost // 2)
    total = int(auth * 0.4 + niche * 0.3 + eng * 0.3)
    if total >= SCORE_THRESHOLD_L3:
        tier = "L3"
    elif total >= SCORE_THRESHOLD_L2:
        tier = "L2"
    else:
        tier = "L1"
    return {
        "authenticity": auth,
        "niche": niche,
        "engagement": eng,
        "total": total,
        "tier": tier,
        "reason": f"Mock score for {handle} (no DeepSeek API key configured)",
    }
