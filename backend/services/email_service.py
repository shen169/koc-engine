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
    tier_info = {"L1": "Explorer — free samples", "L2": "Creator — samples + 15-20% commission", "L3": "Partner — fixed incentives + traffic support"}
    subject = "Welcome to KOC Engine!"
    body = f"""Hi {koc_name},

Your creator application has been approved. You are now a **{tier}** ({tier_info.get(tier, '')}).

**Next Steps:**
1. Log in to browse available products
2. Express interest or accept tasks in the Task Hall
3. Receive free samples from brands
4. Create content and earn commissions

Let's create something great together!

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_match_email(koc_email: str, koc_name: str, product_name: str, company_name: str):
    subject = "You've been matched!"
    body = f"""Hi {koc_name},

You've been matched with **{company_name}** for **{product_name}**.

A free sample is on the way. Check your portal for tracking details.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_ship_email(koc_email: str, koc_name: str, product_name: str, tracking: str, carrier: str):
    subject = f"Your sample has shipped — {product_name}"
    body = f"""Hi {koc_name},

Your sample of **{product_name}** has been shipped!

Carrier: {carrier}
Tracking: {tracking}

Once you receive it, create your content and submit it in your portal.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_review_email(koc_email: str, koc_name: str, product_name: str, decision: str, note: str = ""):
    if decision == "approved":
        subject = f"Content approved — {product_name}"
        body = f"""Hi {koc_name},

Your content for **{product_name}** has been approved!

Your pledge has been refunded and credits unlocked. Keep creating!

— KOC Engine Team
"""
    else:
        subject = f"Content needs revision — {product_name}"
        body = f"""Hi {koc_name},

Your content for **{product_name}** needs revision.

Reason: {note if note else 'Not specified'}
Please revise and resubmit in your portal.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_violation_email(koc_email: str, koc_name: str, reason: str, penalty: str):
    subject = "Task Violation Notice"
    body = f"""Hi {koc_name},

Your task has been flagged for violation.

Reason: {reason}
Penalty: {penalty}

You can appeal by contacting support.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)


def send_warning_email(koc_email: str, koc_name: str, product_name: str, days_left: int):
    subject = f"Deadline approaching — {product_name}"
    body = f"""Hi {koc_name},

Your task for **{product_name}** has {days_left} days remaining.

Please submit your content to avoid a timeout penalty.

— KOC Engine Team
"""
    send_email_async(koc_email, subject, body)
