"""AI 判别评分路由"""

from fastapi import APIRouter, Depends
from models import ScoringRequest
from services.scorer import score_application
from auth import require_admin

router = APIRouter(tags=["scoring"])


@router.post("/scoring/evaluate-application")
def evaluate_application(data: dict):
    """对申请做三维评分（公开调用）"""
    handle = data.get("handle", "")
    platform = data.get("platform", "tiktok")
    video_links = data.get("video_links", [])
    niche = data.get("niche", "general")
    profile_url = data.get("profile_url", "")
    follower_count = data.get("follower_count", 0)
    return score_application(handle, platform, video_links, niche, profile_url, follower_count)


@router.post("/scoring/evaluate-profile")
def evaluate_profile(data: dict, current_user: dict = Depends(require_admin)):
    """对已有 KOC 重新评分"""
    return score_application(
        data.get("handle", ""),
        data.get("platform", "tiktok"),
        data.get("video_links", []),
        data.get("niche", "general"),
        data.get("profile_url", ""),
        int(data.get("follower_count", 0)),
    )
