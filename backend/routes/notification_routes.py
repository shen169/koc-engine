"""站内通知路由"""

from fastapi import APIRouter, Depends, HTTPException
from models import Notification
from stores.notification_store import notification_store
from auth import get_current_user, require_admin

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
def list_notifications(limit: int = 50, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    return [n.model_dump() for n in notification_store.list_by_user(user_id, limit)]


@router.get("/notifications/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)):
    return {"count": notification_store.unread_count(current_user["sub"])}


@router.put("/notifications/{notif_id}/read")
def mark_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    ok = notification_store.mark_read(notif_id, current_user["sub"])
    if not ok:
        raise HTTPException(404, "Notification not found")
    return {"status": "ok"}


@router.put("/notifications/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    n = notification_store.mark_all_read(current_user["sub"])
    return {"status": "ok", "marked": n}
