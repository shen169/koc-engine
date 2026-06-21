"""Email service — SMTP sending for KOC notifications"""

import os
import smtplib
import threading
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

log = logging.getLogger("email_service")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@kocengine.com")

EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def _send_email_sync(to_email: str, subject: str, body: str):
    """Send email synchronously via SMTP. Logs instead of raising."""
    if not EMAIL_ENABLED:
        log.info(f"[email disabled] To: {to_email} | Subject: {subject}")
        log.info(f"[email body]\n{body}")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        log.info(f"[email sent] To: {to_email} | Subject: {subject}")
    except Exception as e:
        log.error(f"[email failed] To: {to_email} | Error: {e}")
        log.info(f"[email fallback body]\n{body}")


def send_email_async(to_email: str, subject: str, body: str):
    """Send email in background thread — never block API response."""
    t = threading.Thread(target=_send_email_sync, args=(to_email, subject, body), daemon=True)
    t.start()


# ═══════════════════════════════════════════
# Template functions
# ═══════════════════════════════════════════

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
• 1,000 bonus points credited (use as task pledge)
• Browse the Task Hall for brand collaboration opportunities
• Earn commission in platform points: 1pt = $1 USD
• Commission + 9pt pledge returned on content approval

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
• Once approved: you earn your commission + 9pt pledge return

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

• Your commission + 9pt pledge return have been credited to your account
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
