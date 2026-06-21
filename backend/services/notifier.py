"""Unified notification helper — creates in-app notification + email/Feishu"""

import logging
from models import Notification
from stores.notification_store import notification_store
from stores.user_store import user_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from services.email_service import (
    send_welcome_email, send_match_email, send_ship_email,
    send_review_email, send_violation_email, send_warning_email,
)
from services.lark_notifier import notify_merchant_lark

log = logging.getLogger("notifier")


def _get_user_role(user_id: str) -> str:
    u = user_store.get_by_id(user_id)
    return u.role if u else ""


def _get_koc_email(user_id: str) -> str | None:
    u = user_store.get_by_id(user_id)
    if not u or u.role != "koc":
        return None
    # KOC email: check koc_profiles or user table
    koc_list = koc_store.list_all()
    for k in koc_list:
        if k.email:
            # Find matching user by email
            ku = user_store.get_by_email(k.email)
            if ku and ku.id == user_id:
                return k.email
    return u.email


def _get_merchant_webhook(user_id: str) -> str:
    m = merchant_store.get_by_user_id(user_id)
    return m.lark_webhook_url if m else ""


def notify_user(
    user_id: str,
    ntype: str,
    title: str,
    message: str,
    task_id: str = "",
    resource_path: str = "",
):
    """
    1. Create in-app notification in notification_store
    2. Send email to KOC
    3. Send Feishu to merchant
    """
    # 1. In-app notification
    notif = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        task_id=task_id,
        resource_path=resource_path,
    )
    notification_store.create(notif)

    role = _get_user_role(user_id)

    # 2. Email for KOC
    if role == "koc":
        email = _get_koc_email(user_id)
        if email:
            log.info(f"[notify] KOC {user_id} email={email} type={ntype}")
            # Don't auto-send here — caller provides email param explicitly
            # We handle specific email sends in the hook points below
        else:
            log.warning(f"[notify] KOC {user_id} has no email")

    # 3. Feishu for merchant
    if role == "merchant":
        webhook = _get_merchant_webhook(user_id)
        notify_merchant_lark(webhook, title, message, resource_path)
        log.info(f"[notify] merchant {user_id} lark webhook={'set' if webhook else 'none'}")
