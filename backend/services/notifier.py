"""Unified notification helper — in-app + email + Feishu

三通道通知体系（V2.3）：
- KOC：站内信 + 邮件
- 商家：站内信 + 邮件 + 飞书 Webhook
- Admin：仅站内信

所有通知类型使用 config.NotifType 常量，避免字符串不一致。
"""

import logging
from config import NotifType
from models import Notification
from stores.notification_store import notification_store
from stores.user_store import user_store
from stores.koc_store import koc_store
from stores.merchant_store import merchant_store
from services.email_service import send_email_async, send_template_email_async
from services.lark_notifier import notify_merchant_lark

log = logging.getLogger("notifier")

# ── 通知类型 → 飞书卡片颜色映射 ──
_LARK_COLOR_MAP = {
    NotifType.TASK_ACCEPTED: "blue",
    NotifType.TASK_DECLINED: "red",
    NotifType.TASK_SHIPPED: "green",
    NotifType.RECEIPT_CONFIRMED: "green",
    NotifType.RECEIPT_AUTO: "green",
    NotifType.CONTENT_SUBMITTED: "blue",
    NotifType.CONTENT_APPROVED: "blue",
    NotifType.CONTENT_REVISION: "red",
    NotifType.CONTENT_AI_OVERRULE: "blue",
    NotifType.AUTO_APPROVED: "green",
    NotifType.VIOLATION: "red",
    NotifType.APPLICATION_APPROVED: "blue",
    NotifType.INTEREST_RECEIVED: "green",
    NotifType.KOC_MATCHED: "blue",
    NotifType.TIER_CHANGED: "green",
    NotifType.TASK_REMATCHED: "blue",
    NotifType.DEADLINE_WARNING: "red",
    NotifType.PLATFORM_ANNOUNCEMENT: "blue",
    NotifType.TASK_IDLE_WARNING: "red",
    NotifType.TASK_DELETED: "blue",
}


def _get_user_role(user_id: str) -> str:
    u = user_store.get_by_id(user_id)
    return u.role if u else ""


def _get_koc_email(user_id: str) -> str | None:
    """通过 user_id 获取 KOC 邮箱。先从 user 表取，再回退到 koc_profiles 桥接。"""
    u = user_store.get_by_id(user_id)
    if not u or u.role != "koc":
        return None
    # 优先使用 user 表中的 email（通常与 koc profile 一致）
    if u.email:
        return u.email
    # 回退：通过 koc_profiles → user 表桥接
    koc_list = koc_store.list_all()
    for k in koc_list:
        if k.email:
            ku = user_store.get_by_email(k.email)
            if ku and ku.id == user_id:
                return k.email
    return None


def _get_merchant_email(user_id: str) -> str | None:
    """通过 user_id 获取商家邮箱"""
    u = user_store.get_by_id(user_id)
    if not u or u.role != "merchant":
        return None
    return u.email or None


def _get_merchant_webhook(user_id: str) -> str:
    m = merchant_store.get_by_user_id(user_id)
    return m.lark_webhook_url if m else ""


def _get_lark_color(ntype: str) -> str:
    """根据通知类型返回飞书卡片颜色，不再用标题关键词猜测。"""
    return _LARK_COLOR_MAP.get(ntype, "green")


def notify_user(
    user_id: str,
    ntype: str,
    title: str,
    message: str,
    task_id: str = "",
    resource_path: str = "",
    template_name: str = "",
    template_vars: dict | None = None,
):
    """
    统一通知入口：站内信 + 邮件 + 飞书。

    参数：
    - user_id: 接收人 user_id
    - ntype: 通知类型（必须使用 NotifType 常量）
    - title: 站内信标题
    - message: 站内信正文
    - task_id: 关联任务 ID（可选）
    - resource_path: 前端跳转路径（可选）
    - template_name: 邮件模板名称（可选，如 "welcome"/"match"/"ship"/"review_approved"/"review_revision"/"violation"/"warning"）
    - template_vars: 邮件模板变量（可选，配合 template_name 使用）
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
        if template_name and template_vars:
            send_template_email_async(email, template_name, **template_vars)
        else:
            send_email_async(email, title, message)

    # ③ 飞书 Webhook（商家专属）
    if role == "merchant":
        webhook = _get_merchant_webhook(user_id)
        lark_color = _get_lark_color(ntype)
        notify_merchant_lark(webhook, title, message, resource_path, lark_color)
