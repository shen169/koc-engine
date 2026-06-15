"""邮件回执服务 — 使用 gmail-assistant skill"""


def send_welcome_email(koc_email: str, koc_name: str, tier: str) -> dict:
    """审核通过 → 欢迎信"""
    tier_info = {"L1": "体验官 — 你将获得免费样品试用", "L2": "创作官 — 样品 + 15-20% 佣金", "L3": "合伙人 — 固定激励 + 流量扶持"}
    subject = "🎉 Welcome to the Creator Program!"
    body = f"""Hi {koc_name},

Congratulations! Your application has been approved. You are now a **{tier}** ({tier_info.get(tier, '')}).

**Next Steps:**
1. Log in at your Creator Portal to browse available products
2. Express interest in products you'd like to promote
3. Once matched with a brand, we'll ship you free samples
4. Create content using our AI video tools
5. Submit your video and earn credits + commissions

Your account includes **30 free credits** to get started.

Let's create something great together!

— KOC Engine Team
"""
    return {"to": koc_email, "subject": subject, "body": body}


def send_rejection_email(koc_email: str, koc_name: str) -> dict:
    """审核拒绝 → 婉拒信"""
    subject = "Update on Your Creator Application"
    body = f"""Hi {koc_name},

Thank you for applying to our Creator Program. After careful review, we're unable to approve your application at this time.

This could be due to:
- Content style not matching our current brand needs
- Insufficient engagement metrics
- Incomplete application information

You're welcome to re-apply in 30 days. In the meantime, keep creating great content!

Best,
KOC Engine Team
"""
    return {"to": koc_email, "subject": subject, "body": body}


def send_application_received(koc_email: str, koc_name: str) -> dict:
    """申请提交 → 自动回执"""
    subject = "We received your application!"
    body = f"""Hi {koc_name},

We've received your creator application. Our AI is reviewing your profile right now.

You'll hear back from us within 24-48 hours.

In the meantime, feel free to explore what we offer at our website.

— KOC Engine Team
"""
    return {"to": koc_email, "subject": subject, "body": body}


def send_match_notification(koc_email: str, koc_name: str, product_name: str, company_name: str) -> dict:
    """双向匹配成功 → 通知 KOC"""
    subject = f"💚 You've been matched with {company_name}!"
    body = f"""Hi {koc_name},

Great news! You've been matched with **{company_name}** for the product **{product_name}**.

**What happens next:**
- We'll ship a free sample to your address
- Once you receive it, create a video review
- Submit the video link in your Creator Portal
- Earn credits and unlock more opportunities

Exciting times ahead!

— KOC Engine Team
"""
    return {"to": koc_email, "subject": subject, "body": body}


def send_ghosted_warning(koc_email: str, koc_name: str, days_overdue: int) -> dict:
    """逾期提醒 → 警告信"""
    subject = "⚠️ Action Required: Your task is overdue"
    body = f"""Hi {koc_name},

This is a reminder that your task is now **{days_overdue} days overdue**.

Please submit your video link as soon as possible to avoid being marked as inactive. If you're having issues, reply to this email.

— KOC Engine Team
"""
    return {"to": koc_email, "subject": subject, "body": body}
