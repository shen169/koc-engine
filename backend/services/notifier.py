"""Unified notification helper — in-app + email + Feishu

三通道通知体系（V2）：
- KOC：站内信 + 邮件
- 商家：站内信 + 邮件 + 飞书 Webhook
- Admin：仅站内信
"""

import logging
from models import Notification
from stores.notification_store import notification_store
from stores.user_store import user_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from services.email_service import send_email_async
from services.lark_notifier import notify_merchant_lark

log = logging.getLogger("notifier")


def _get_user_role(user_id: str) -> str:
    u = user_store.get_by_id(user_id)
    return u.role if u else ""


def _get_koc_email(user_id: str) -> str | None:
    u = user_store.get_by_id(user_id)
    if not u or u.role != "koc":
        return None
    # KOC email: check koc_profiles → user table
    koc_list = koc_store.list_all()
    for k in koc_list:
        if k.email:
            ku = user_store.get_by_email(k.email)
            if ku and ku.id == user_id:
                return k.email
    return u.email


def _get_merchant_email(user_id: str) -> str | None:
    """通过 user_id 获取商家邮箱"""
    u = user_store.get_by_id(user_id)
    if not u or u.role != "merchant":
        return None
    return u.email or None


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
    统一通知入口：站内信 + 邮件 + 飞书。
    - KOC：站内信 + 邮件
    - 商家：站内信 + 邮件 + 飞书
    """
    if not user_id:
        return

    # ① 站内信（所有人）
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

    # ② 邮件（KOC + 商家）
    if role == "koc":
        email = _get_koc_email(user_id)
    elif role == "merchant":
        email = _get_merchant_email(user_id)
    else:
        email = None

    if email:
        send_email_async(email, title, message)

    # ③ 飞书 Webhook（商家专属）
    if role == "merchant":
        webhook = _get_merchant_webhook(user_id)
        notify_merchant_lark(webhook, title, message, resource_path)
