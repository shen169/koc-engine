"""Email service — Resend HTTP API for KOC notifications

DEPRECATED: The template functions and send_template_email_async() are being replaced by
notification_templates.py. New code should use notify_user() with render_kwargs instead of
template_name + template_vars. The old dispatch path in notifier.py is kept for backward
compatibility during migration but will be removed once all call sites are migrated.
"""

import os
import json
import threading
import logging
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

log = logging.getLogger("email_service")

# Resend config — uses HTTP API (SMTP blocked in some regions)
RESEND_API_KEY = os.getenv("SMTP_PASS", "")  # Resend API key stored as SMTP_PASS
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@kocengine.com")
RESEND_API_URL = "https://api.resend.com/emails"

EMAIL_ENABLED = bool(RESEND_API_KEY and SMTP_FROM)


def _send_email_sync(to_email: str, subject: str, body: str):
    """Send email via Resend HTTP API. Logs instead of raising."""
    if not EMAIL_ENABLED:
        log.info(f"[email disabled] To: {to_email} | Subject: {subject}")
        log.info(f"[email body]\n{body}")
        return

    try:
        payload = json.dumps({
            "from": SMTP_FROM,
            "to": [to_email],
            "subject": subject,
            "text": body,
        }).encode("utf-8")

        req = Request(
            RESEND_API_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "User-Agent": "koc-engine/2.0",
            },
        )
        resp = urlopen(req, timeout=15)
        result = json.loads(resp.read())
        log.info(f"[email sent] To: {to_email} | Subject: {subject} | Resend ID: {result.get('id', 'N/A')}")
    except HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode()
        except Exception:
            pass
        log.error(f"[email failed] To: {to_email} | HTTP {e.code}: {body_text}")
        log.info(f"[email fallback body]\n{body}")
    except Exception as e:
        log.error(f"[email failed] To: {to_email} | Error: {type(e).__name__}: {e}")
        log.info(f"[email fallback body]\n{body}")


def send_email_async(to_email: str, subject: str, body: str):
    """Send email in background thread — never block API response."""
    t = threading.Thread(target=_send_email_sync, args=(to_email, subject, body), daemon=True)
    t.start()


# ═══════════════════════════════════════════
# Template functions
# ═══════════════════════════════════════════

def send_registration_email(user_email: str, role: str):
    """注册成功后的欢迎邮件 — 区分 KOC 和商家"""
    if role == "merchant":
        subject = "Welcome to KOC Engine — Start Publishing Tasks"
        body = f"""Welcome to KOC Engine!

Your merchant account has been created. You received **100 bonus points**.

**Next Steps:**
1. Create your merchant profile at https://kocengine.com/dashboard
2. List your products with commission links
3. Publish a task — Urgent tasks auto-match creators instantly
4. KOCs create content, you approve → creators earn commission, you get content

**Task Costs:**
• 5pt platform fee per task publish (non-refundable)
• Commission per creator: 20-50pt (paid only on approved content)
• Service fee of 10% (min 1pt) on creator earnings

Questions? Reply to this email or contact support.

— KOC Engine Team
"""
    else:
        subject = "Welcome to KOC Engine — Your Creator Journey Starts Here"
        body = f"""Welcome to KOC Engine!

Your creator account has been created. You received **200 bonus points**.

**Next Steps:**
1. Complete your creator application at https://kocengine.com/koc/apply
2. Get AI scored and auto-approved instantly
3. Browse the Task Hall for brand collaboration opportunities
4. Accept a task (10pt pledge required, refunded on completion)

**Creator Benefits:**
• Free product samples from brands
• Earn commission in platform points: 1pt = $1 USD
• 90% commission (withdrawable) + full pledge returned on content approval
• Repeat collaborations boost your match score

— KOC Engine Team
"""
    send_email_async(user_email, subject, body)


def send_welcome_email(koc_email: str, koc_name: str, tier: str):
    tier_info = {
        "L1": "Explorer — receive free samples, build your portfolio",
        "L2": "Creator — priority matching + earn commission (1pt=$1)",
        "L3": "Partner — premium brand deals + highest match priority"
    }
    subject = "Welcome to KOC Engine!"
    body = f"""Hi {koc_name},

Your creator application has been approved! You are now a **{tier}** creator.

{tier_info.get(tier, '')}

**Your Benefits:**
• 200 bonus points credited (use as task pledge)
• Browse the Task Hall for brand collaboration opportunities
• Earn commission in platform points: 1pt = $1 USD
• 90% commission (withdrawable) + full pledge returned on content approval

**Next Steps:**
1. Log in at https://kocengine.com/portal
2. Browse the Task Hall and Product Pool
3. Accept a task (10pt pledge required, refunded on completion)
4. Receive free samples, create content, earn commission

Let's create something great together!

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_match_email(koc_email: str, koc_name: str, product_name: str, company_name: str):
    subject = f"You've been matched — {product_name}"
    body = f"""Hi {koc_name},

You've been matched with **{company_name}** for **{product_name}**.

**What happens next:**
• The brand will ship your free sample within 48 hours
• You'll receive a tracking number once shipped
• After receiving, create content and submit it via your portal
• The brand reviews your content within 3 days
• Once approved: you earn 90% commission (withdrawable) + full pledge return (bonus)

View details: https://kocengine.com/portal/tasks

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_ship_email(koc_email: str, koc_name: str, product_name: str, tracking: str, carrier: str):
    subject = f"Your sample has shipped — {product_name}"
    body = f"""Hi {koc_name},

Your sample of **{product_name}** is on the way!

• Carrier: {carrier}
• Tracking: {tracking}

**Your deadlines:**
• Confirm receipt within 7 days of delivery
• Submit content within 14 days of receiving
• Late submission = 10pt pledge forfeited + Trust -15

Track your shipment and submit content at https://kocengine.com/portal/tasks

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_review_email(koc_email: str, koc_name: str, product_name: str, decision: str, note: str = ""):
    if decision == "approved":
        subject = f"Content approved — {product_name}"
        body = f"""Hi {koc_name},

Your content for **{product_name}** has been approved!

• Your commission (minus 10% platform fee, min 1pt) + full pledge return have been credited to your account
• Trust Score +3
• Points are withdrawable at 1pt = $1 USD

View your earnings: https://kocengine.com/portal/credits

— KOC Engine Team
"""
    else:
        subject = f"Content needs revision — {product_name}"
        body = f"""Hi {koc_name},

Your content for **{product_name}** needs revision.

**Reason:** {note if note else 'Not specified'}

**What to do:**
• Revise and resubmit within 3 days
• You have 1 revision attempt remaining
• If the brand rejects again, AI will make the final judgment
• Late resubmission = 10pt pledge forfeited + Trust -15

Resubmit at: https://kocengine.com/portal/tasks

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_violation_email(koc_email: str, koc_name: str, reason: str, penalty: str):
    subject = "Task Violation Notice"
    body = f"""Hi {koc_name},

Your task has been flagged for a violation.

**Reason:** {reason}
**Penalty:** {penalty}

If you believe this is an error, you can contact support within 48 hours.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_warning_email(koc_email: str, koc_name: str, product_name: str, days_left: int):
    subject = f"⏰ Deadline approaching — {product_name}"
    body = f"""Hi {koc_name},

Your content submission for **{product_name}** is due in **{days_left} days**.

**If you miss the deadline:**
• 10pt pledge will be forfeited
• Commission returned to the brand
• Trust Score -15

Submit now: https://kocengine.com/portal/tasks

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


# ═══════════════════════════════════════════
# 模板调度器 — 供 notifier.py 统一调用
# ═══════════════════════════════════════════

def send_template_email_async(to_email: str, template_name: str, **kwargs):
    """
    根据模板名称调度到对应的邮件模板函数。
    支持的模板：
    - "welcome": koc_name, tier
    - "match": koc_name, product_name, company_name
    - "ship": koc_name, product_name, tracking, carrier
    - "review_approved": koc_name, product_name
    - "review_revision": koc_name, product_name, note
    - "violation": koc_name, reason, penalty
    - "warning": koc_name, product_name, days_left
    - "application_approved": koc_name, tier
    - "receipt_confirmed": koc_name, product_name
    """
    koc_name = kwargs.get("koc_name", "Creator")
    product_name = kwargs.get("product_name", "")
    company_name = kwargs.get("company_name", "")
    tracking = kwargs.get("tracking", "")
    carrier = kwargs.get("carrier", "")
    reason = kwargs.get("reason", "")
    penalty = kwargs.get("penalty", "")
    days_left = kwargs.get("days_left", 0)
    tier = kwargs.get("tier", "L1")
    note = kwargs.get("note", "")
    task_name = kwargs.get("task_name", product_name)

    template_dispatch = {
        "welcome": lambda: send_welcome_email(to_email, koc_name, tier),
        "registration_koc": lambda: send_registration_email(to_email, "koc"),
        "registration_merchant": lambda: send_registration_email(to_email, "merchant"),
        "match": lambda: send_match_email(to_email, koc_name, product_name, company_name),
        "ship": lambda: send_ship_email(to_email, koc_name, product_name, tracking, carrier),
        "review_approved": lambda: send_review_email(to_email, koc_name, product_name, "approved"),
        "review_revision": lambda: send_review_email(to_email, koc_name, product_name, "revision", note),
        "violation": lambda: send_violation_email(to_email, koc_name, reason, penalty),
        "warning": lambda: send_warning_email(to_email, koc_name, task_name, days_left or 3),
        "application_approved": lambda: send_welcome_email(to_email, koc_name, tier),
        "receipt_confirmed": lambda: send_email_async(
            to_email,
            f"Receipt confirmed — {task_name}",
            f"Hi {koc_name},\n\nYour receipt of **{task_name}** has been confirmed. You have 14 days to create and submit your content.\n\nSubmit at: https://kocengine.com/portal/tasks\n\n— KOC Engine Team",
        ),
    }

    fn = template_dispatch.get(template_name)
    if fn:
        fn()
    else:
        # Unknown template — still send a basic email so nothing is dropped
        subject = kwargs.get("subject", "KOC Engine Notification")
        body = kwargs.get("body", str(kwargs))
        send_email_async(to_email, subject, body)
