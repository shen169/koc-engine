"""
Notification Templates — KOC Engine
Single source of truth for ALL user-facing notification content.

Architecture:
- Each template returns {in_app_title, in_app_message, email_subject, email_body}
- render(ntype, role, **kwargs) → dict dispatches to the correct template
- In-app messages are concise (1-3 sentences, user is already in the app)
- Emails are complete (full context, rules, CTA — user may read offline)

Design principles (every template must include):
1. Platform mission — "Creator-Brand Collaboration, Made Accessible"
2. Transparent rules — pledge amounts, SLA deadlines, point impacts
3. Clear next-step CTA — what to do + where to go

Tone: professional but warm, like a reliable partner.
"""

from config import NotifType, KOC_PLATFORM_FEE_RATE, KOC_PLATFORM_FEE_MIN, KOC_PLEDGE_SAMPLE
from config import PT_TO_USD, PLATFORM_SERVICE_FEE
from config import TIER_COMMISSION_MAX, TIER_MAX_ACTIVE_SLOTS, TIER_UPGRADE_TASKS, TIER_UPGRADE_MIN_RATING


# ═══════════════════════════════════════════
# Brand Constants
# ═══════════════════════════════════════════

MISSION = "Creator-Brand Collaboration, Made Accessible"
SIGNATURE = "The KOC Engine Team"
PLATFORM_URL = "https://kocengine.com"


# ═══════════════════════════════════════════
# Shared Rule Snippets
# ═══════════════════════════════════════════

RULES_PLEDGE_KOC = (
    f"Pledge: Sample tasks = {KOC_PLEDGE_SAMPLE}pt (refunded on completion). "
    f"Commission tasks = pledge equals commission amount (skin in the game). "
    f"Fully refunded on approved content. Forfeited if you miss SLA deadlines."
)

RULES_COMMISSION = (
    f"Commission: paid in platform points. 1pt = ${PT_TO_USD} USD. "
    f"Platform fee: {int(KOC_PLATFORM_FEE_RATE * 100)}% (min {KOC_PLATFORM_FEE_MIN}pt) on creator earnings."
)

RULES_SLA_TIMELINE = (
    "SLA Timeline: Brand ships within 48h → You confirm receipt within 7d → "
    "Submit content within 14d → Brand reviews within 3d."
)

RULES_TRUST = (
    "Trust Score impacts your tier and matching priority. "
    "Complete tasks: +3. Miss deadlines: -15. Violations: -20 to -30."
)

RULES_TIER_KOC = {
    "L1": "Explorer — sample tasks only (free products, {KOC_PLEDGE_SAMPLE}pt pledge), max {TIER_MAX_ACTIVE_SLOTS.get('L1', 2)} concurrent tasks",
    "L2": "Creator — commission tasks 20-50pt + priority matching, max {TIER_MAX_ACTIVE_SLOTS.get('L2', 3)} concurrent tasks",
    "L3": "Partner — premium commissions up to 500pt + highest match priority + ×3 repeat collab bonus, max {TIER_MAX_ACTIVE_SLOTS.get('L3', 5)} concurrent tasks",
}

RULES_TIER_MERCHANT = {
    "M1": "Bronze Merchant — sample-only tasks, max {TIER_MAX_KOC_REQUIRED.get('M1', 2)} KOCs/task",
    "M2": "Silver Merchant — commission tasks 20-50pt + urgent available, max {TIER_MAX_KOC_REQUIRED.get('M2', 3)} KOCs/task",
    "M3": "Gold Merchant — premium commissions up to 500pt + featured placement, max {TIER_MAX_KOC_REQUIRED.get('M3', 10)} KOCs/task",
}

RULES_WITHDRAWAL = (
    f"Withdrawal: minimum {3} completed tasks + {100}pt withdrawable balance. "
    f"Daily cap: {500}pt. 1pt = ${PT_TO_USD} USD."
)

RULES_APPEAL = (
    "If you believe this is an error, contact support within 48 hours for review."
)


# ═══════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════

def _fmt_link(text: str, url: str) -> str:
    """Format a clickable link for plain-text email (some clients auto-link URLs)."""
    return f"{text}: {url}"


# ═══════════════════════════════════════════
# KOC TEMPLATES
# ═══════════════════════════════════════════

def _tpl_koc_registration(**kwargs) -> dict:
    """KOC just registered an account — welcome + guide to apply."""
    name = kwargs.get("koc_name", "Creator")
    points = kwargs.get("points", 200)
    resource_path = kwargs.get("resource_path", "/koc/apply")

    return {
        "in_app_title": "Welcome to KOC Engine!",
        "in_app_message": (
            f"Your creator account is ready. You received {points}pt bonus. "
            f"Next step: complete your application to unlock the Task Hall and start earning."
        ),
        "email_subject": f"Welcome to KOC Engine — Your Creator Journey Starts Here",
        "email_body": f"""Hi {name},

Welcome to KOC Engine — {MISSION}

Your creator account has been created. You received **{points} bonus points** to get started.

What Makes KOC Engine Different:
We're not just a marketplace. We're building a trusted community where creators and brands collaborate transparently. No hidden fees, no delayed payments, no guessing games.

Your Progression — Start Small, Grow Big:
Everyone starts at L1 (Explorer). Complete tasks to level up:
• L1 → L2: Complete {TIER_UPGRADE_TASKS['L1_to_L2']} sample tasks (avg rating ≥ {TIER_UPGRADE_MIN_RATING}) → unlock commission tasks
• L2 → L3: Complete {TIER_UPGRADE_TASKS['L2_to_L3']} total tasks + Trust ≥ 55 → unlock premium commissions (up to {TIER_COMMISSION_MAX.get('L3', 500)}pt)

Your Next Steps:
1. Complete your creator application → auto-approved as L1 Explorer
2. Browse the Task Hall for sample collaboration opportunities
3. Accept a sample task ({KOC_PLEDGE_SAMPLE}pt pledge, fully refunded on completion)
4. Receive free product samples, create content → earn your first completion
5. Level up to L2 Creator → unlock commission tasks (20-50pt)

Transparent Rules:
- Sample tasks: {KOC_PLEDGE_SAMPLE}pt pledge (refunded on completion)
- Commission tasks: pledge = commission amount (skin in the game)
- {RULES_COMMISSION}
- {RULES_SLA_TIMELINE}
- {RULES_WITHDRAWAL}

Complete your application now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_application_approved(**kwargs) -> dict:
    """KOC application auto-approved — always L1 in V2.6 (打怪升级)."""
    name = kwargs.get("koc_name", "Creator")
    tier = "L1"  # V2.6: everyone starts at L1
    score = kwargs.get("score", 0)
    resource_path = kwargs.get("resource_path", "/portal")

    tier_label = "Explorer"

    return {
        "in_app_title": f"Application Approved — Welcome, Explorer!",
        "in_app_message": (
            f"Your creator application has been approved. You start as L1 Explorer. "
            f"Complete {TIER_UPGRADE_TASKS['L1_to_L2']} sample tasks to unlock commission tasks (L2 Creator). "
            f"Browse the Task Hall to find your first sample collaboration."
        ),
        "email_subject": f"Application Approved — Welcome to KOC Engine!",
        "email_body": f"""Hi {name},

Congratulations! Your creator application has been approved.

{MISSION}

You Start As: L1 Explorer
Everyone begins at Explorer — prove your skills, earn trust, level up.

Your Progression Path:
• L1 Explorer (Now): Sample tasks only — receive free products, create content
  → Upgrade: Complete {TIER_UPGRADE_TASKS['L1_to_L2']} sample tasks with avg rating ≥ {TIER_UPGRADE_MIN_RATING}
• L2 Creator: Unlock commission tasks (20-50pt), {TIER_MAX_ACTIVE_SLOTS.get('L2', 3)} concurrent tasks
  → Upgrade: Complete {TIER_UPGRADE_TASKS['L2_to_L3']} total tasks + Trust ≥ 55
• L3 Partner: Premium commissions up to {TIER_COMMISSION_MAX.get('L3', 500)}pt, {TIER_MAX_ACTIVE_SLOTS.get('L3', 5)} concurrent tasks

Your Benefits Now (L1):
• Browse the Task Hall for sample collaboration opportunities
• Receive free product samples from brands
• {KOC_PLEDGE_SAMPLE}pt pledge per task (fully refunded on completion)
• Level up to unlock commission earnings (1pt = ${PT_TO_USD} USD)

Your Creator Toolkit:
• Task Hall: browse open tasks → {PLATFORM_URL}/portal/hall
• My Tasks: track active collaborations → {PLATFORM_URL}/portal/tasks
• Credits: view balance & earnings → {PLATFORM_URL}/portal/credits

Transparent Rules:
- Sample tasks: {KOC_PLEDGE_SAMPLE}pt pledge, refunded on completion
- Commission tasks: pledge = commission (skin in the game)
- {RULES_SLA_TIMELINE}
- {RULES_TRUST}

Ready to start? Browse the Task Hall:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_task_accepted(**kwargs) -> dict:
    """KOC accepted a task — pledge deducted, SLA starts."""
    product_name = kwargs.get("product_name", "this product")
    pledge = kwargs.get("pledge_koc", 0)
    commission = kwargs.get("commission", 30)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Task Accepted — Pledge Deducted",
        "in_app_message": (
            f"You accepted {product_name}. {pledge}pt pledge deducted. "
            f"Brand ships within 48h. Submit content within 14d of receipt to earn {commission}pt commission."
        ),
        "email_subject": f"Task Accepted: {product_name} — {pledge}pt Pledge Deducted",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

You've accepted the task for **{product_name}**.

{MISSION}

What Happens Now:
1. Brand ships your free sample within 48 hours
2. Confirm receipt when the package arrives (7-day window)
3. Create authentic content showcasing the product
4. Submit content within 14 days of receipt
5. Brand reviews within 3 days → you earn {commission}pt commission

Your Commitments:
- {pledge}pt pledge is held as commitment — fully refunded on approved content
- Late submission = {pledge}pt forfeited + Trust Score -15
- Content must be original and created by you (author mismatch = Trust Score -30)
- Commission paid at 1pt = ${PT_TO_USD} USD ({int((1 - KOC_PLATFORM_FEE_RATE) * 100)}% withdrawable)

Track your task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_task_declined(**kwargs) -> dict:
    """KOC declined a task — Trust Score impact."""
    product_name = kwargs.get("product_name", "this product")
    trust_change = kwargs.get("trust_change", -3)
    resource_path = kwargs.get("resource_path", "/portal/hall")

    return {
        "in_app_title": "Task Declined",
        "in_app_message": (
            f"You declined {product_name}. "
            f"Trust Score {trust_change} (active rejection). Browse the Task Hall for other opportunities."
        ),
        "email_subject": f"Task Declined: {product_name} — Trust Score {trust_change}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

You've declined the task for **{product_name}**.

Trust Score Impact: {trust_change} (active rejection)
Repeated rejections lower your match priority and may affect your tier.

Finding the Right Fit:
Browse the Task Hall to find collaborations that match your interests and platform:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_task_shipped(**kwargs) -> dict:
    """Brand shipped sample to KOC."""
    product_name = kwargs.get("product_name", "this product")
    tracking = kwargs.get("tracking", "N/A")
    carrier = kwargs.get("carrier", "N/A")
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Your Sample Has Shipped!",
        "in_app_message": (
            f"{product_name} shipped via {carrier}. Tracking: {tracking}. "
            f"Confirm receipt within 7 days of delivery."
        ),
        "email_subject": f"Your Sample Has Shipped — {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your sample of **{product_name}** is on the way!

Tracking Details:
• Carrier: {carrier}
• Tracking Number: {tracking}

{MISSION}

Your Deadlines:
• Confirm receipt within 7 days of delivery (upload unboxing photos)
• Submit content within 14 days of confirming receipt
• Late submission = {0}pt pledge forfeited + Trust Score -15

What To Do When It Arrives:
1. Take unboxing photos
2. Log in and confirm receipt
3. Start creating — authentic content performs best!

Track your shipment:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_receipt_confirmed(**kwargs) -> dict:
    """KOC confirmed receipt — content creation countdown starts."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Receipt Confirmed — Start Creating!",
        "in_app_message": (
            f"Receipt confirmed for {product_name}. "
            f"You have 14 days to create and submit your content. Make it authentic!"
        ),
        "email_subject": f"Receipt Confirmed — Create Content for {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your receipt of **{product_name}** has been confirmed. The 14-day content creation window starts now.

{MISSION}

Content Guidelines:
• Create authentic, original content featuring the product
• Content must be created and posted by you (not reposted or AI-generated)
• Include your genuine experience — audiences trust real opinions
• Submit the public URL where your content is live

Your Deadline:
• Submit within 14 days → earn commission + full pledge return
• Miss the deadline → {0}pt pledge forfeited + Trust Score -15

Submit your content at:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_receipt_auto(**kwargs) -> dict:
    """System auto-confirmed receipt via tracking."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Receipt Auto-Confirmed",
        "in_app_message": (
            f"System detected delivery of {product_name}. "
            f"Receipt auto-confirmed. You have 14 days to submit content."
        ),
        "email_subject": f"Receipt Auto-Confirmed — {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

The system has automatically confirmed delivery of **{product_name}** based on carrier tracking data.

Your 14-day content creation window has started. Submit your content by the deadline to earn your commission and full pledge return.

Track your task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_content_approved(**kwargs) -> dict:
    """Brand approved KOC content — earnings released."""
    product_name = kwargs.get("product_name", "this product")
    commission = kwargs.get("koc_commission", 30)
    pledge_return = kwargs.get("pledge_return", 0)
    trust_change = kwargs.get("trust_change", 3)
    resource_path = kwargs.get("resource_path", "/portal/credits")

    return {
        "in_app_title": "Content Approved — Earnings Credited!",
        "in_app_message": (
            f"Your content for {product_name} was approved! "
            f"+{commission}pt commission + {pledge_return}pt pledge returned. Trust Score +{trust_change}."
        ),
        "email_subject": f"Content Approved — +{commission}pt Earned on {product_name}!",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Great news! Your content for **{product_name}** has been approved.

{MISSION}

Earnings Breakdown:
• Commission earned: +{commission}pt
• Pledge returned: +{pledge_return}pt
• Platform fee ({int(KOC_PLATFORM_FEE_RATE * 100)}%): -{max(KOC_PLATFORM_FEE_MIN, int(commission * KOC_PLATFORM_FEE_RATE))}pt
• Trust Score: +{trust_change}

Withdrawable Balance: 1pt = ${PT_TO_USD} USD
{RULES_WITHDRAWAL}

Repeat collaborations with the same brand boost your match score (+3 each time, up to +15).

View your earnings:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_content_revision(**kwargs) -> dict:
    """Brand requested content revision."""
    product_name = kwargs.get("product_name", "this product")
    feedback = kwargs.get("feedback", "Not specified")
    revisions_left = kwargs.get("revisions_left", 1)
    deadline_days = kwargs.get("deadline_days", 3)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Content Needs Revision",
        "in_app_message": (
            f"{product_name}: Brand requested revisions. Reason: {feedback}. "
            f"{revisions_left} resubmission attempt(s) left. Deadline: {deadline_days} days."
        ),
        "email_subject": f"Content Revision Needed — {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

The brand has reviewed your content for **{product_name}** and requested revisions.

Brand Feedback:
"{feedback}"

{MISSION}

What You Need To Do:
• Revise your content based on the feedback above
• Resubmit within {deadline_days} days
• You have {revisions_left} revision attempt(s) remaining

Important:
- If the brand rejects again after this revision, AI (DeepSeek) will make the final binding decision
- Missing the revision deadline = {0}pt pledge forfeited + Trust Score -15

Revise and resubmit now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_ai_final_reject(**kwargs) -> dict:
    """AI final judgment — content rejected, penalty applied."""
    product_name = kwargs.get("product_name", "this product")
    reason = kwargs.get("reason", "Content did not meet quality standards")
    pledge = kwargs.get("pledge_koc", 0)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "AI Final Judgment — Content Rejected",
        "in_app_message": (
            f"{product_name}: AI reviewed and upheld the rejection. "
            f"{pledge}pt pledge forfeited. Trust Score -15. Reason: {reason}"
        ),
        "email_subject": f"AI Final Decision — Content Rejected for {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

After two brand rejections, AI (DeepSeek) reviewed your content for **{product_name}** and made the final binding decision: **Rejected**.

Reason:
"{reason}"

Penalty Breakdown:
• {pledge}pt pledge forfeited (not refunded)
• Trust Score: -15
• This may affect your tier and matching priority

{MISSION}

What This Means:
• The brand's commission is returned
• Your tier may be downgraded if Trust Score drops below thresholds
• You can rebuild Trust Score by completing future tasks successfully

{RULES_APPEAL}

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_deadline_warning(**kwargs) -> dict:
    """SLA deadline approaching — urgent action needed."""
    product_name = kwargs.get("product_name", "this product")
    days_left = kwargs.get("days_left", 3)
    stage = kwargs.get("stage", "submit")  # receive, submit, revision
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    stage_labels = {
        "receive": ("confirm receipt", "shipment"),
        "submit": ("submit content", "content creation"),
        "revision": ("resubmit revised content", "revision"),
    }
    action, category = stage_labels.get(stage, ("complete this step", "task"))

    urgency = "🚨" if days_left <= 2 else "⏰"

    return {
        "in_app_title": f"{urgency} {days_left} Days Left — {action.title()}!",
        "in_app_message": (
            f"{product_name}: Only {days_left} day(s) left to {action}. "
            f"Missing the deadline = {0}pt pledge forfeited + Trust Score -15."
        ),
        "email_subject": f"{urgency} {days_left} Day(s) Left — {action.title()} for {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your {category} deadline for **{product_name}** is approaching.

Time Remaining: {days_left} day(s)

If you miss this deadline:
• {0}pt pledge will be forfeited
• Trust Score: -15
• Commission goes back to the brand

Don't let your hard work go to waste. {action.title()} now:
{PLATFORM_URL}{resource_path}

{MISSION}

{SIGNATURE}
"""
    }


def _tpl_koc_violation(**kwargs) -> dict:
    """KOC missed a deadline — pledge forfeited, Trust penalized."""
    product_name = kwargs.get("product_name", "this product")
    violation_type = kwargs.get("violation_type", "submit_timeout")
    pledge = kwargs.get("pledge_koc", 0)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    violation_labels = {
        "submit_timeout": (
            "Content Submission Timeout",
            "missed the 14-day content submission deadline",
        ),
        "revision_timeout": (
            "Revision Timeout",
            "missed the 3-day revision resubmission deadline",
        ),
        "author_mismatch": (
            "Content Author Mismatch",
            "submitted content from an account that does not match your profile",
            -30,
        ),
        "scrape_failed_twice": (
            "Content Verification Failed",
            "content URL could not be verified after 2 scraping attempts",
        ),
    }

    label, reason, *rest = violation_labels.get(
        violation_type,
        ("Task Violation", "violated task terms"),
    )
    trust_change = rest[0] if rest else -15

    return {
        "in_app_title": f"{label} — Pledge Forfeited",
        "in_app_message": (
            f"{product_name}: You {reason}. "
            f"{pledge}pt pledge forfeited. Trust Score {trust_change}."
        ),
        "email_subject": f"{label} — {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

A violation has been recorded on your task for **{product_name}**.

Reason: You {reason}.

Penalty Breakdown:
• {pledge}pt pledge forfeited (not refunded)
• Trust Score: {trust_change}
• Your tier may be affected if Trust Score drops below thresholds

{MISSION}

How to Recover:
• Complete future tasks successfully to rebuild Trust Score
• Maintain a high average rating (≥4.0) for tier bonuses
• Consistent on-time delivery restores your match priority

{RULES_APPEAL}

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_tier_changed(**kwargs) -> dict:
    """KOC tier upgraded or downgraded."""
    old_tier = kwargs.get("old_tier", "L1")
    new_tier = kwargs.get("new_tier", "L2")
    trust_score = kwargs.get("trust_score", 0)
    direction = kwargs.get("direction", "up")  # "up" or "down"
    resource_path = kwargs.get("resource_path", "/portal")

    new_label = {"L1": "Explorer", "L2": "Creator", "L3": "Partner"}.get(new_tier, new_tier)
    old_label = {"L1": "Explorer", "L2": "Creator", "L3": "Partner"}.get(old_tier, old_tier)
    new_desc = RULES_TIER_KOC.get(new_tier, "")

    verb = "Upgraded" if direction == "up" else "Downgraded"
    emoji = "🎉" if direction == "up" else "📉"

    return {
        "in_app_title": f"{emoji} Tier {verb} — {new_label}",
        "in_app_message": (
            f"Your tier changed: {old_label} → {new_label}. "
            f"Trust Score: {trust_score}. {new_desc}"
        ),
        "email_subject": f"Tier {verb}: {old_label} → {new_label} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your creator tier has been {verb.lower()}.

{old_label} ({old_tier}) → {new_label} ({new_tier})

Trust Score: {trust_score}/100

Your New Tier Benefits:
{new_desc}

{MISSION}

{'Keep up the great work! Higher tiers unlock premium brand deals and priority matching.' if direction == 'up' else 'You can recover your tier by completing tasks on time and maintaining high ratings.'}

View your profile:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


# ── V2.6: 等级升级 + 限制模板 ──

def _tpl_koc_tier_upgraded(**kwargs) -> dict:
    """KOC 等级升级祝贺 + 新权益."""
    name = kwargs.get("koc_name", "Creator")
    old_tier = kwargs.get("old_tier", "L1")
    new_tier = kwargs.get("new_tier", "L2")
    completed_tasks = kwargs.get("completed_tasks", 0)
    resource_path = kwargs.get("resource_path", "/portal")
    tier_labels = {"L1": "Explorer", "L2": "Creator", "L3": "Partner"}
    old_label = tier_labels.get(old_tier, old_tier)
    new_label = tier_labels.get(new_tier, new_tier)
    benefits = {
        "L2": f"Commission tasks unlocked (20-50pt), {TIER_MAX_ACTIVE_SLOTS.get('L2', 3)} concurrent slots, pledge=commission",
        "L3": f"Premium commissions up to {TIER_COMMISSION_MAX.get('L3', 500)}pt, {TIER_MAX_ACTIVE_SLOTS.get('L3', 5)} concurrent slots, x3 repeat collab bonus",
    }
    return {
        "in_app_title": f"🎉 Level Up! {old_label} → {new_label}",
        "in_app_message": (
            f"After {completed_tasks} completed tasks, you've leveled up to {new_label}! "
            f"New benefits: {benefits.get(new_tier, 'enhanced matching')}. Check your profile."
        ),
        "email_subject": f"🎉 Level Up! You're Now a {new_label} on KOC Engine",
        "email_body": f"""Hi {name},

CONGRATULATIONS! You've leveled up!

{old_label} ({old_tier}) → {new_label} ({new_tier})

After completing {completed_tasks} tasks with consistent quality, you've earned your upgrade.

{MISSION}

New Benefits:
{benefits.get(new_tier, 'Enhanced matching priority + higher task limits')}

Your Growth: {completed_tasks} completed tasks — the community trusts you more.

Next: Browse new tier-appropriate tasks → {PLATFORM_URL}/portal/hall

Keep creating, keep earning!

{SIGNATURE}
"""
    }


def _tpl_merchant_tier_upgraded(**kwargs) -> dict:
    """商家等级升级."""
    name = kwargs.get("merchant_name", "Brand")
    old_tier = kwargs.get("old_tier", "M1")
    new_tier = kwargs.get("new_tier", "M2")
    completed_tasks = kwargs.get("completed_tasks", 0)
    resource_path = kwargs.get("resource_path", "/dashboard")
    tier_labels = {"M1": "Bronze", "M2": "Silver", "M3": "Gold"}
    old_label = tier_labels.get(old_tier, old_tier)
    new_label = tier_labels.get(new_tier, new_tier)
    benefits = {
        "M2": f"Commission tasks unlocked (20-50pt), {TIER_MAX_KOC_REQUIRED.get('M2', 3)} KOCs/task",
        "M3": f"Premium commissions up to {TIER_COMMISSION_MAX.get('M3', 500)}pt, {TIER_MAX_KOC_REQUIRED.get('M3', 10)} KOCs/task, x3 repeat collab bonus",
    }
    return {
        "in_app_title": f"🎉 Level Up! {old_label} → {new_label}",
        "in_app_message": (
            f"After {completed_tasks} completed collaborations, your store leveled up to {new_label}! "
            f"New publishing limits unlocked."
        ),
        "email_subject": f"🎉 Level Up! Your Store is Now {new_label} on KOC Engine",
        "email_body": f"""Hi {name},

CONGRATULATIONS! Your store has leveled up!

{old_label} ({old_tier}) → {new_label} ({new_tier})

After {completed_tasks} collaborations with consistent quality, you've earned your upgrade.

{MISSION}

New Benefits:
{benefits.get(new_tier, 'Enhanced publishing limits + higher matching priority')}

Your Growth: {completed_tasks} completed collaborations — the community trusts you more.

Next: Publish new tier-appropriate tasks → {PLATFORM_URL}/dashboard/tasks/new

Keep shipping, keep growing!

{SIGNATURE}
"""
    }


def _tpl_tier_restriction(**kwargs) -> dict:
    """等级限制拦截提示（in-app only）."""
    tier = kwargs.get("tier", "L1")
    role = kwargs.get("role", "koc")
    if role == "koc":
        return {
            "in_app_title": "🔒 Tier Locked — Complete Sample Tasks First",
            "in_app_message": (
                f"Complete {TIER_UPGRADE_TASKS.get('L1_to_L2', 3)} sample tasks "
                f"with avg rating ≥ {TIER_UPGRADE_MIN_RATING} to unlock commission tasks (L2 Creator)."
            ),
            "email_subject": "", "email_body": "",
        }
    else:
        return {
            "in_app_title": "🔒 Tier Locked — Complete Sample Tasks First",
            "in_app_message": (
                f"Complete {TIER_UPGRADE_TASKS.get('M1_to_M2', 3)} sample collaborations "
                f"with avg rating ≥ {TIER_UPGRADE_MIN_RATING} to unlock commission tasks (M2 Silver)."
            ),
            "email_subject": "", "email_body": "",
        }


def _tpl_koc_auto_approved(**kwargs) -> dict:
    """Merchant didn't review within 3 days — auto-approved by system."""
    product_name = kwargs.get("product_name", "this product")
    commission = kwargs.get("koc_commission", 30)
    pledge_return = kwargs.get("pledge_return", 0)
    resource_path = kwargs.get("resource_path", "/portal/credits")

    return {
        "in_app_title": "Content Auto-Approved — Earnings Credited!",
        "in_app_message": (
            f"{product_name}: Brand missed the 3-day review window. "
            f"Content auto-approved. +{commission}pt commission + {pledge_return}pt pledge returned."
        ),
        "email_subject": f"Content Auto-Approved — +{commission}pt Earned on {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

The brand did not review your content for **{product_name}** within the 3-day window. Your content has been **automatically approved** by the system.

Earnings Breakdown:
• Commission earned: +{commission}pt
• Pledge returned: +{pledge_return}pt
• Trust Score: +3 (standard completion bonus)

{MISSION}

This policy protects creators from brands who delay reviews. Your earnings are always secure.

View your earnings:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_matched(**kwargs) -> dict:
    """KOC was matched to a product/task."""
    product_name = kwargs.get("product_name", "this product")
    company_name = kwargs.get("company_name", "a brand")
    pledge = kwargs.get("pledge_koc", 0)
    commission = kwargs.get("commission", 30)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "You've Been Matched!",
        "in_app_message": (
            f"Matched with {company_name} for {product_name}. "
            f"{pledge}pt pledge deducted. Brand ships within 48h. Earn {commission}pt on completion."
        ),
        "email_subject": f"You've Been Matched — {product_name} by {company_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

You've been matched with **{company_name}** for **{product_name}**!

{MISSION}

What Happens Next:
1. Brand ships your free sample within 48 hours
2. Confirm receipt with unboxing photos (7-day window)
3. Create and submit authentic content (14-day deadline)
4. Brand reviews → you earn {commission}pt commission + {pledge}pt pledge returned

Your Commitment:
- {pledge}pt pledge held as commitment (fully refunded on approved content)
- Late submission or missed deadlines = pledge forfeited + Trust Score penalty
- Original content only — author mismatches trigger Trust Score -30

View task details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_interest_registered(**kwargs) -> dict:
    """KOC expressed interest in a product — confirmation."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/portal/products")

    return {
        "in_app_title": "Interest Registered",
        "in_app_message": (
            f"You expressed interest in {product_name}. "
            f"The brand has been notified. We'll update you when there's a match."
        ),
        "email_subject": f"Interest Registered — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

You've expressed interest in **{product_name}**. The brand has been notified.

{MISSION}

What Happens Next:
• The brand reviews your interest
• If matched, you'll receive a notification with task details
• You can also browse the Task Hall for open opportunities

Browse more products:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_scraper_verified(**kwargs) -> dict:
    """Content performance data verified by scraper."""
    product_name = kwargs.get("product_name", "this product")
    views = kwargs.get("views", 0)
    likes = kwargs.get("likes", 0)
    engagement = kwargs.get("engagement_rate", 0)
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Content Data Verified",
        "in_app_message": (
            f"{product_name}: Platform verified your content performance. "
            f"Views: {views}, Likes: {likes}, Engagement: {engagement}%"
        ),
        "email_subject": f"Content Performance Verified — {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

The platform has verified the performance data for your content on **{product_name}**.

Performance Snapshot:
• Views: {views:,}
• Likes: {likes:,}
• Engagement Rate: {engagement}%

{MISSION}

Your content metrics contribute to your performance score, which affects your match priority and tier progression.

View your tasks:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_scrape_failed_once(**kwargs) -> dict:
    """Scraper failed to verify content URL — one more chance."""
    product_name = kwargs.get("product_name", "this product")
    error_msg = kwargs.get("error_msg", "Unable to access content URL")
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    return {
        "in_app_title": "Content URL Could Not Be Verified — Please Resubmit",
        "in_app_message": (
            f"{product_name}: Could not verify your content URL ({error_msg}). "
            f"You have 1 chance to resubmit with a correct URL. Second failure = {0}pt forfeited + Trust Score -15."
        ),
        "email_subject": f"Content URL Verification Failed — Resubmit for {product_name}",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

The platform attempted to verify your content URL for **{product_name}** but was unable to access it.

Error: {error_msg}

{MISSION}

What You Need To Do:
• Check that the URL is correct and publicly accessible
• Resubmit with a valid content URL
• This is your ONLY retry — a second failure will result in:
  - {0}pt pledge forfeited
  - Trust Score -15

Resubmit now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


# ═══════════════════════════════════════════
# MERCHANT TEMPLATES
# ═══════════════════════════════════════════

def _tpl_merchant_registration(**kwargs) -> dict:
    """Merchant just registered — welcome + setup guide."""
    name = kwargs.get("merchant_name", "Brand")
    points = kwargs.get("points", 100)
    resource_path = kwargs.get("resource_path", "/dashboard")

    return {
        "in_app_title": "Welcome to KOC Engine!",
        "in_app_message": (
            f"Your merchant account is ready. You received {points}pt bonus. "
            f"Next: create your profile, list products, and publish your first task."
        ),
        "email_subject": "Welcome to KOC Engine — Start Publishing Tasks",
        "email_body": f"""Hi {name},

Welcome to KOC Engine — {MISSION}

Your merchant account has been created with **{points} bonus points**.

What Makes KOC Engine Different:
We connect brands with authentic creators. No inflated follower counts, no fake engagement — just real content from real people. Our pledge economy ensures both sides are committed.

Your Setup Guide:
1. Create your merchant profile → {PLATFORM_URL}/dashboard
2. List your products with commission links → {PLATFORM_URL}/dashboard/products/new
3. Publish a task — Urgent tasks auto-match creators instantly
4. KOCs create content, you approve → creators earn commission, you get authentic content

Task Costs:
• {PLATFORM_SERVICE_FEE}pt platform fee per task publish (non-refundable)
• Commission per creator: 20-50pt (paid only on approved content)
• Platform fee of {int(KOC_PLATFORM_FEE_RATE * 100)}% (min {KOC_PLATFORM_FEE_MIN}pt) on creator earnings

Transparent Rules:
- You must ship product samples within 48h of KOC accepting
- Review submitted content within 3 days (or system auto-approves)
- Trust Score below 40 → cannot publish new tasks
- Complete collaborations boost your Trust Score and tier

Get started:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_task_accepted(**kwargs) -> dict:
    """KOC accepted the merchant's task."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "KOC Accepted Your Task",
        "in_app_message": (
            f"A creator has accepted {product_name}. "
            f"Ship the sample within 48h to avoid Trust Score penalty (-20)."
        ),
        "email_subject": f"Creator Accepted — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

A creator has accepted your task for **{product_name}**.

{MISSION}

Your Next Step — Ship Within 48 Hours:
• Prepare the product sample and ship it to the creator
• Upload tracking number and carrier info in your dashboard
• Miss the 48h deadline = Trust Score -20 + commission pool forfeited

Timeline After Shipping:
• Creator confirms receipt (7-day window)
• Creator submits content (14-day deadline)
• You review content (3-day window) → approve or request revision

Ship now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_task_declined(**kwargs) -> dict:
    """KOC declined the merchant's task — auto-rematch."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Creator Declined — Slot Released",
        "in_app_message": (
            f"A creator declined {product_name}. "
            f"The system will attempt to auto-rematch the slot with another creator."
        ),
        "email_subject": f"Creator Declined — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

A creator has declined the task for **{product_name}**. The slot has been released.

{MISSION}

What Happens Now:
• The system will attempt to rematch the empty slot automatically
• No action needed from you — we'll notify you when a new creator accepts
• For urgent tasks, rematching happens within minutes

View task status:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_receipt_confirmed(**kwargs) -> dict:
    """KOC confirmed receipt — content creation in progress."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Creator Confirmed Receipt",
        "in_app_message": (
            f"Creator confirmed receipt of {product_name}. "
            f"Content creation in progress — expect submission within 14 days."
        ),
        "email_subject": f"Creator Confirmed Receipt — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

The creator has confirmed receipt of **{product_name}**. Content creation is now in progress.

{MISSION}

Timeline:
• Creator has 14 days to create and submit content
• Once submitted, you have 3 days to review
• Approve → commission released, Trust Score +3 for both sides
• Request revision → creator has 3 days to resubmit (1 revision allowed)

You'll be notified when the content is ready for review.

View task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_content_submitted(**kwargs) -> dict:
    """KOC submitted content — merchant needs to review."""
    product_name = kwargs.get("product_name", "this product")
    review_days = kwargs.get("review_days", 3)
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Content Ready for Review",
        "in_app_message": (
            f"Creator submitted content for {product_name}. "
            f"Review within {review_days} days. Auto-approval if you miss the deadline."
        ),
        "email_subject": f"Content Ready for Review — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Content has been submitted for your review on **{product_name}**.

{MISSION}

Review Deadline: {review_days} days
If you don't review within {review_days} days, the system will auto-approve the content and release the commission.

Your Options:
• **Approve** — commission paid to creator, Trust Score +3 for both sides, task complete
• **Reject** — creator has 1 chance to revise and resubmit within 3 days
• After a second rejection, AI (DeepSeek) makes the final binding decision

Review now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_review_approved(**kwargs) -> dict:
    """Merchant approved content — payment released."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Review Approved — Task Complete!",
        "in_app_message": (
            f"Content for {product_name} approved. "
            f"Commission released to creator. Trust Score +3. Don't forget to rate the creator!"
        ),
        "email_subject": f"Content Approved — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

You approved the content for **{product_name}**. The task is now complete!

{MISSION}

What Happened:
• Commission released to the creator from your pre-paid pool
• Trust Score: +3 for both you and the creator
• Creator's pledge returned in full

Next Step:
Rate the creator! Your rating contributes to their tier progression and match quality.
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_revision_requested(**kwargs) -> dict:
    """Merchant requested revision — awaiting KOC resubmission."""
    product_name = kwargs.get("product_name", "this product")
    revisions_left = kwargs.get("revisions_left", 1)
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Revision Requested — Awaiting Resubmission",
        "in_app_message": (
            f"Revision requested for {product_name}. "
            f"Creator has {revisions_left} attempt(s) left (3-day deadline)."
        ),
        "email_subject": f"Revision Requested — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

You've requested content revisions for **{product_name}**. The creator has been notified.

{MISSION}

What Happens Now:
• Creator revises and resubmits within 3 days
• Remaining revision attempts: {revisions_left}
• If the creator misses the deadline → {0}pt pledge forfeited, commission refunded to you
• If you reject again after resubmission → AI (DeepSeek) makes the final binding decision

View task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_auto_approved(**kwargs) -> dict:
    """Merchant missed 3-day review window — auto-approved."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Content Auto-Approved — Review Window Missed",
        "in_app_message": (
            f"{product_name}: You missed the 3-day review window. "
            f"Content auto-approved and commission released to creator."
        ),
        "email_subject": f"Content Auto-Approved — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

The 3-day review window for **{product_name}** has expired. The content has been **automatically approved** and the commission has been released to the creator.

{MISSION}

To avoid auto-approvals in the future:
• Review submitted content promptly (within 3 days)
• Set up email notifications to stay on top of submissions
• Your Trust Score is not penalized for auto-approvals, but you miss the opportunity to ensure quality

View task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_koc_violation(**kwargs) -> dict:
    """KOC violated — commission refunded to merchant."""
    product_name = kwargs.get("product_name", "this product")
    commission = kwargs.get("commission", 30)
    violation_type = kwargs.get("violation_type", "submit_timeout")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    reasons = {
        "submit_timeout": "missed the 14-day content submission deadline",
        "revision_timeout": "missed the 3-day revision resubmission deadline",
        "author_mismatch": "submitted content from an account that does not match their profile",
        "scrape_failed_twice": "content URL could not be verified after 2 attempts",
    }
    reason = reasons.get(violation_type, "violated task terms")

    return {
        "in_app_title": "Creator Violation — Commission Refunded",
        "in_app_message": (
            f"{product_name}: Creator {reason}. "
            f"{commission}pt commission refunded to your account."
        ),
        "email_subject": f"Creator Violation — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

A violation has been recorded on the task for **{product_name}**.

Reason: The creator {reason}.

Your Compensation:
• {commission}pt commission refunded to your account
• Creator's {0}pt pledge forfeited
• Creator's Trust Score penalized

{MISSION}

You can republish the task or create a new one to find another creator.

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_ship_timeout(**kwargs) -> dict:
    """Merchant missed 48h ship deadline — violation."""
    product_name = kwargs.get("product_name", "this product")
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Shipping Deadline Missed — Task Disputed",
        "in_app_message": (
            f"You did not ship {product_name} within 48h. "
            f"Trust Score -20. Commission pool forfeited. Creator's pledge refunded."
        ),
        "email_subject": f"Shipping Deadline Missed — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

You missed the 48-hour shipping deadline for **{product_name}**.

Penalty:
• Trust Score: -20
• Commission pool forfeited (not refunded)
• Creator's pledge fully refunded
• Task marked as disputed

{MISSION}

Shipping on time is critical to maintaining creator trust and your merchant tier. If Trust Score drops below 40, you cannot publish new tasks.

{RULES_APPEAL}

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_task_idle(**kwargs) -> dict:
    """Long-term task has empty slots for 7 days."""
    product_name = kwargs.get("product_name", "this product")
    empty_slots = kwargs.get("empty_slots", 1)
    total_slots = kwargs.get("total_slots", 1)
    pledge_merchant = kwargs.get("pledge_merchant", 0)
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Task Idle — Empty Slots for 7 Days",
        "in_app_message": (
            f"{product_name}: {empty_slots}/{total_slots} slot(s) empty for 7 days. "
            f"Delete to refund {pledge_merchant + PLATFORM_SERVICE_FEE}pt or recreate as Urgent for auto-matching."
        ),
        "email_subject": f"Task Idle for 7 Days — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your task **{product_name}** has had {empty_slots} empty slot(s) out of {total_slots} for 7 days.

{MISSION}

Your Options:
1. **Delete the task** — full refund: {pledge_merchant}pt commission pool + {PLATFORM_SERVICE_FEE}pt platform fee ({pledge_merchant + PLATFORM_SERVICE_FEE}pt total)
2. **Wait longer** — creators may still discover and accept in the Task Hall
3. **Recreate as Urgent** — urgent tasks get auto-matched to creators instantly

The system will NOT auto-force-match — you're in control.

Manage your task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_task_deleted(**kwargs) -> dict:
    """Merchant deleted a task — refund details."""
    product_name = kwargs.get("product_name", "this product")
    total_refunded = kwargs.get("total_refunded", 0)
    pledge_merchant = kwargs.get("pledge_merchant", 0)
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    return {
        "in_app_title": "Task Deleted — Credits Refunded",
        "in_app_message": (
            f"Your task \"{product_name}\" has been deleted. "
            f"{total_refunded}pt refunded ({pledge_merchant}pt commission pool + {PLATFORM_SERVICE_FEE}pt platform fee)."
        ),
        "email_subject": f"Task Deleted — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your task **{product_name}** has been deleted.

Refund Breakdown:
• Commission pool refunded: {pledge_merchant}pt
• Platform fee refunded: {PLATFORM_SERVICE_FEE}pt
• Total refunded: {total_refunded}pt

{MISSION}

The refunded credits are available in your account balance immediately.

Create a new task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_interest_received(**kwargs) -> dict:
    """KOC expressed interest in merchant's product."""
    product_name = kwargs.get("product_name", "this product")
    platform = kwargs.get("platform", "social media")
    resource_path = kwargs.get("resource_path", "/dashboard/products")

    return {
        "in_app_title": "New Interest Signal",
        "in_app_message": (
            f"A creator ({platform}) expressed interest in {product_name}. "
            f"Review their profile and decide if you want to collaborate."
        ),
        "email_subject": f"Creator Interested — {product_name} | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

A creator on {platform} has expressed interest in your product **{product_name}**.

{MISSION}

What This Means:
• The creator wants to collaborate on this product
• If you have an open task with available slots, the system can auto-assign them
• Review and manage interests in your dashboard

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_ai_overrule(**kwargs) -> dict:
    """AI overruled merchant's decision."""
    product_name = kwargs.get("product_name", "this product")
    reason = kwargs.get("reason", "AI reviewed the content and made a binding decision")
    direction = kwargs.get("direction", "approved")  # "approved" or "rejected"
    resource_path = kwargs.get("resource_path", "/dashboard/tasks")

    if direction == "approved":
        in_app_title = "AI Overruled Your Rejection — Content Approved"
        in_app_msg = (
            f"{product_name}: AI reviewed the content and overruled your rejection. "
            f"Commission released to creator. Reason: {reason}"
        )
        email_subject = f"AI Decision — Content Approved for {product_name} | KOC Engine"
        email_body = f"""Hi {kwargs.get('merchant_name', 'Brand')},

After your second rejection of the content for **{product_name}**, AI (DeepSeek) reviewed the submission and made the final binding decision: **Approved**.

AI Reasoning:
"{reason}"

Outcome:
• Commission released to the creator from your pre-paid pool
• Creator's pledge returned in full
• This decision is final per platform policy

{MISSION}

The AI review system ensures fairness for both sides when there's a dispute. Your Trust Score is not penalized.

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    else:
        in_app_title = "AI Final Judgment — Content Rejected"
        in_app_msg = (
            f"{product_name}: AI upheld your rejection. "
            f"Commission refunded. Creator's pledge forfeited. Reason: {reason}"
        )
        email_subject = f"AI Decision — Content Rejected for {product_name} | KOC Engine"
        email_body = f"""Hi {kwargs.get('merchant_name', 'Brand')},

After your second rejection of the content for **{product_name}**, AI (DeepSeek) reviewed the submission and made the final binding decision: **Rejected**.

AI Reasoning:
"{reason}"

Outcome:
• Commission refunded to your account
• Creator's pledge forfeited
• This decision is final per platform policy

{MISSION}

You can republish the task to find a new creator.

View details:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""

    return {
        "in_app_title": in_app_title,
        "in_app_message": in_app_msg,
        "email_subject": email_subject,
        "email_body": email_body,
    }


def _tpl_merchant_tier_changed(**kwargs) -> dict:
    """Merchant tier upgraded or downgraded."""
    old_tier = kwargs.get("old_tier", "M1")
    new_tier = kwargs.get("new_tier", "M2")
    trust_score = kwargs.get("trust_score", 0)
    direction = kwargs.get("direction", "up")
    resource_path = kwargs.get("resource_path", "/dashboard")

    tier_labels = {"M1": "Bronze", "M2": "Silver", "M3": "Gold"}
    new_label = tier_labels.get(new_tier, new_tier)
    old_label = tier_labels.get(old_tier, old_tier)
    new_desc = RULES_TIER_MERCHANT.get(new_tier, "")

    verb = "Upgraded" if direction == "up" else "Downgraded"
    emoji = "🎉" if direction == "up" else "📉"

    return {
        "in_app_title": f"{emoji} Tier {verb} — {new_label} Merchant",
        "in_app_message": (
            f"Your tier changed: {old_label} → {new_label} Merchant. "
            f"Trust Score: {trust_score}. {new_desc}"
        ),
        "email_subject": f"Tier {verb}: {old_label} → {new_label} Merchant | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your merchant tier has been {verb.lower()}.

{old_label} Merchant ({old_tier}) → {new_label} Merchant ({new_tier})

Trust Score: {trust_score}/100

Your New Tier Benefits:
{new_desc}

{MISSION}

{'Great work! Higher tiers unlock more publishing capacity and better visibility.' if direction == 'up' else 'You can recover your tier by completing collaborations on time and maintaining high creator ratings.'}

View your dashboard:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


# ═══════════════════════════════════════════
# FRAUD / BAN TEMPLATES (shared KOC + Merchant)
# ═══════════════════════════════════════════

def _tpl_koc_flagged(**kwargs) -> dict:
    """KOC flagged for fraud (1st offense)."""
    handle = kwargs.get("handle", "your account")
    resource_path = kwargs.get("resource_path", "/portal")

    return {
        "in_app_title": "Account Flagged — Fraud Warning",
        "in_app_message": (
            f"Your account '{handle}' has been flagged for suspicious activity. "
            f"Active pledges confiscated. You have ONE chance to appeal to admin. "
            f"Second offense = permanent ban."
        ),
        "email_subject": f"Account Flagged — Fraud Warning | KOC Engine",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your KOC account '{handle}' has been **flagged for suspicious activity**.

{MISSION}

What Happened:
• Your active pledges have been confiscated
• You have been removed from all active tasks
• This is your FIRST offense

What You Can Do:
You have ONE chance to provide evidence to admin for review. Contact admin immediately to appeal.

**If flagged again after clearance, your account will be permanently banned and all balances confiscated.**

Contact admin via the platform:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_koc_banned(**kwargs) -> dict:
    """KOC permanently banned (2nd offense)."""
    handle = kwargs.get("handle", "your account")
    resource_path = kwargs.get("resource_path", "/portal")

    return {
        "in_app_title": "Account Permanently Banned",
        "in_app_message": (
            f"Your account '{handle}' has been permanently banned due to repeated fraud. "
            f"All balances confiscated. This decision is final."
        ),
        "email_subject": f"Account Permanently Banned | KOC Engine",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your KOC account '{handle}' has been **permanently banned** due to repeated fraudulent activity.

{MISSION}

Consequences:
• All active pledges confiscated
• All account balances forfeited
• This decision is final and cannot be appealed

We take platform integrity seriously to protect the trusted community of brands and creators.

{SIGNATURE}
"""
    }


def _tpl_koc_restored(**kwargs) -> dict:
    """KOC account restored after successful appeal."""
    handle = kwargs.get("handle", "your account")
    resource_path = kwargs.get("resource_path", "/portal")

    return {
        "in_app_title": "Account Restored — Rectification Approved",
        "in_app_message": (
            f"Your account '{handle}' has been restored after admin review. "
            f"You can accept tasks again. Future fraud detection → permanent ban."
        ),
        "email_subject": f"Account Restored | KOC Engine",
        "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your KOC account '{handle}' has been **restored** after admin review.

{MISSION}

What This Means:
• You can accept tasks again
• You can browse the Task Hall and earn commissions

**Important: Any future fraud detection will result in a permanent ban with no further appeal.**

Browse tasks:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_flagged(**kwargs) -> dict:
    """Merchant flagged for fraud (1st offense)."""
    company_name = kwargs.get("company_name", "your company")
    resource_path = kwargs.get("resource_path", "/dashboard")

    return {
        "in_app_title": "Account Flagged — Fraud Warning",
        "in_app_message": (
            f"Your account '{company_name}' has been flagged for suspicious activity. "
            f"All active tasks cancelled. ONE chance to appeal. Second offense = permanent ban."
        ),
        "email_subject": f"Account Flagged — Fraud Warning | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your merchant account '{company_name}' has been **flagged for suspicious activity**.

{MISSION}

What Happened:
• All active tasks have been cancelled
• Your publishing privileges are suspended
• This is your FIRST offense

What You Can Do:
You have ONE chance to provide evidence to admin for review. Contact admin immediately to appeal.

**If flagged again after clearance, your account will be permanently banned.**

Contact admin via the platform:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_merchant_banned(**kwargs) -> dict:
    """Merchant permanently banned (2nd offense)."""
    company_name = kwargs.get("company_name", "your company")
    resource_path = kwargs.get("resource_path", "/dashboard")

    return {
        "in_app_title": "Account Permanently Banned",
        "in_app_message": (
            f"Your account '{company_name}' has been permanently banned due to repeated fraud. "
            f"All active tasks cancelled. This decision is final."
        ),
        "email_subject": f"Account Permanently Banned | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your merchant account '{company_name}' has been **permanently banned** due to repeated fraudulent activity.

{MISSION}

Consequences:
• All active tasks cancelled
• All account balances forfeited
• This decision is final and cannot be appealed

We take platform integrity seriously to protect the trusted community of creators and brands.

{SIGNATURE}
"""
    }


def _tpl_merchant_restored(**kwargs) -> dict:
    """Merchant account restored after successful appeal."""
    company_name = kwargs.get("company_name", "your company")
    resource_path = kwargs.get("resource_path", "/dashboard")

    return {
        "in_app_title": "Account Restored — Rectification Approved",
        "in_app_message": (
            f"Your account '{company_name}' has been restored after admin review. "
            f"You can publish tasks again. Future fraud detection → permanent ban."
        ),
        "email_subject": f"Account Restored | KOC Engine",
        "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

Your merchant account '{company_name}' has been **restored** after admin review.

{MISSION}

What This Means:
• You can publish tasks again
• Your products are visible in the marketplace

**Important: Any future fraud detection will result in a permanent ban with no further appeal.**

Publish a task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


def _tpl_task_cancelled_fraud(**kwargs) -> dict:
    """Task cancelled because the other party was flagged/banned for fraud."""
    product_name = kwargs.get("product_name", "this task")
    pledge = kwargs.get("pledge_koc", 0)
    commission = kwargs.get("commission", 0)
    cancelled_by = kwargs.get("cancelled_by", "merchant")  # "merchant" or "koc"
    action = kwargs.get("action", "flagged")  # "flagged" or "banned"
    resource_path = kwargs.get("resource_path", "/portal/tasks")

    if cancelled_by == "merchant":
        # KOC receives this — their task got cancelled because merchant was fraudulent
        return {
            "in_app_title": "Task Cancelled — Merchant Flagged",
            "in_app_message": (
                f"Task '{product_name}' cancelled because the merchant was {action}. "
                f"Your {pledge}pt pledge has been fully refunded."
            ),
            "email_subject": f"Task Cancelled — {product_name} | KOC Engine",
            "email_body": f"""Hi {kwargs.get('koc_name', 'Creator')},

Your task for **{product_name}** has been cancelled because the merchant was {action} for fraudulent activity.

{MISSION}

Your Compensation:
• {pledge}pt pledge fully refunded
• No penalty to your Trust Score

We take platform integrity seriously. Your pledge is always protected against fraudulent brands.

Browse other tasks:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
        }
    else:
        # Merchant receives this — KOC was fraudulent
        return {
            "in_app_title": "Creator Removed — Fraud Detected",
            "in_app_message": (
                f"Creator assigned to '{product_name}' was {action} for fraud. "
                f"Slot freed. Your {commission}pt commission refunded."
            ),
            "email_subject": f"Creator Removed — {product_name} | KOC Engine",
            "email_body": f"""Hi {kwargs.get('merchant_name', 'Brand')},

A creator assigned to your task **{product_name}** has been {action} for fraudulent activity and removed from the task.

{MISSION}

Your Compensation:
• {commission}pt commission refunded to your account
• The slot is now open for a new creator
• No penalty to your Trust Score

We take platform integrity seriously. Your commission pool is always protected against fraudulent creators.

View task:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
        }


def _tpl_admin_fraud_alert(**kwargs) -> dict:
    """Admin receives fraud alert."""
    role = kwargs.get("role", "User")
    name = kwargs.get("name", "Unknown")
    user_id = kwargs.get("user_id", "")
    level = kwargs.get("level", "1st Offense")
    confiscated = kwargs.get("confiscated", 0)
    affected = kwargs.get("affected", 0)
    action = kwargs.get("action", "freeze")
    resource_path = kwargs.get("resource_path", "/admin/fraud")

    return {
        "in_app_title": f"Fraud Alert: {role.upper()} {name} — {level}",
        "in_app_message": (
            f"{role.upper()} {name} (ID: {user_id}) triggered fraud enforcement. "
            f"Level: {level}. Confiscated: {confiscated}pt. Affected: {affected} tasks/slots. "
            f"Action: {action}. Review at /admin/fraud."
        ),
        "email_subject": f"Fraud Alert: {role.upper()} {name} — {level} | KOC Engine",
        "email_body": f"""Admin,

A fraud enforcement action has been triggered.

Details:
• Role: {role.upper()}
• Name: {name}
• User ID: {user_id}
• Level: {level}
• Confiscated: {confiscated}pt
• Tasks/Slots Affected: {affected}
• Action Taken: {action}

Review this case:
{PLATFORM_URL}{resource_path}

— KOC Engine Automated System
"""
    }


# ═══════════════════════════════════════════
# PLATFORM ANNOUNCEMENT
# ═══════════════════════════════════════════

def _tpl_platform_announcement(**kwargs) -> dict:
    """Generic platform announcement template."""
    title = kwargs.get("announcement_title", "Platform Announcement")
    body = kwargs.get("announcement_body", "")
    resource_path = kwargs.get("resource_path", "")

    return {
        "in_app_title": title,
        "in_app_message": body,
        "email_subject": f"{title} | KOC Engine",
        "email_body": f"""Hi,

{body}

{MISSION}

{kwargs.get('cta_text', 'Learn more')}:
{PLATFORM_URL}{resource_path or ''}

{SIGNATURE}
"""
    }


# ═══════════════════════════════════════════
# REVIEW REMINDER (post-completion)
# ═══════════════════════════════════════════

def _tpl_review_reminder(**kwargs) -> dict:
    """Task completed — remind user to rate the other party."""
    product_name = kwargs.get("product_name", "this product")
    entity_name = kwargs.get("entity_name", "your partner")
    resource_path = kwargs.get("resource_path", "")

    return {
        "in_app_title": f"Rate {entity_name}",
        "in_app_message": (
            f"Collaboration on \"{product_name}\" is complete. "
            f"How was your experience with {entity_name}? Leave a rating to help the community."
        ),
        "email_subject": f"Rate {entity_name} — {product_name} | KOC Engine",
        "email_body": f"""Hi,

Your collaboration on **{product_name}** with {entity_name} is complete!

{MISSION}

Your rating helps:
• Other creators/brands make informed decisions
• Improve match quality for everyone
• Contribute to Trust Score accuracy

Rate now:
{PLATFORM_URL}{resource_path}

{SIGNATURE}
"""
    }


# ═══════════════════════════════════════════
# DISPATCH TABLE & RENDER FUNCTION
# ═══════════════════════════════════════════

# Maps (ntype, role) → template function
# For ntypes with sub-variants, the template function handles differentiation internally
_DISPATCH = {
    # ── Registration & Application ──
    (NotifType.APPLICATION_APPROVED, "koc"): _tpl_koc_application_approved,
    ("registration", "koc"): _tpl_koc_registration,
    ("registration", "merchant"): _tpl_merchant_registration,

    # ── Task Lifecycle (KOC) ──
    (NotifType.TASK_ACCEPTED, "koc"): _tpl_koc_task_accepted,
    (NotifType.TASK_DECLINED, "koc"): _tpl_koc_task_declined,
    (NotifType.TASK_SHIPPED, "koc"): _tpl_koc_task_shipped,
    (NotifType.RECEIPT_CONFIRMED, "koc"): _tpl_koc_receipt_confirmed,
    (NotifType.RECEIPT_AUTO, "koc"): _tpl_koc_receipt_auto,
    (NotifType.CONTENT_APPROVED, "koc"): _tpl_koc_content_approved,
    (NotifType.CONTENT_REVISION, "koc"): _tpl_koc_content_revision,
    (NotifType.AUTO_APPROVED, "koc"): _tpl_koc_auto_approved,
    (NotifType.KOC_MATCHED, "koc"): _tpl_koc_matched,
    (NotifType.INTEREST_RECEIVED, "koc"): _tpl_koc_interest_registered,

    # ── Task Lifecycle (Merchant) ──
    (NotifType.TASK_ACCEPTED, "merchant"): _tpl_merchant_task_accepted,
    (NotifType.TASK_DECLINED, "merchant"): _tpl_merchant_task_declined,
    (NotifType.RECEIPT_CONFIRMED, "merchant"): _tpl_merchant_receipt_confirmed,
    (NotifType.RECEIPT_AUTO, "merchant"): _tpl_merchant_receipt_confirmed,  # reuse
    (NotifType.CONTENT_SUBMITTED, "merchant"): _tpl_merchant_content_submitted,
    (NotifType.CONTENT_APPROVED, "merchant"): _tpl_merchant_review_approved,
    (NotifType.CONTENT_REVISION, "merchant"): _tpl_merchant_revision_requested,
    (NotifType.AUTO_APPROVED, "merchant"): _tpl_merchant_auto_approved,
    (NotifType.INTEREST_RECEIVED, "merchant"): _tpl_merchant_interest_received,
    (NotifType.TASK_IDLE_WARNING, "merchant"): _tpl_merchant_task_idle,
    (NotifType.TASK_DELETED, "merchant"): _tpl_merchant_task_deleted,

    # ── Violations & Penalties ──
    (NotifType.VIOLATION, "koc"): _tpl_koc_violation,
    (NotifType.VIOLATION, "merchant"): _tpl_merchant_koc_violation,

    # ── Deadline Warnings ──
    (NotifType.DEADLINE_WARNING, "koc"): _tpl_koc_deadline_warning,
    (NotifType.DEADLINE_WARNING, "merchant"): _tpl_koc_deadline_warning,  # same structure

    # ── AI Overrule ──
    (NotifType.CONTENT_AI_OVERRULE, "koc"): _tpl_koc_auto_approved,  # close enough
    (NotifType.CONTENT_AI_OVERRULE, "merchant"): _tpl_merchant_ai_overrule,

    # ── Tier Changes ──
    (NotifType.TIER_CHANGED, "koc"): _tpl_koc_tier_changed,
    (NotifType.TIER_CHANGED, "merchant"): _tpl_merchant_tier_changed,
    (NotifType.TIER_UPGRADED, "koc"): _tpl_koc_tier_upgraded,
    (NotifType.TIER_UPGRADED, "merchant"): _tpl_merchant_tier_upgraded,
    (NotifType.TIER_RESTRICTION, "koc"): _tpl_tier_restriction,
    (NotifType.TIER_RESTRICTION, "merchant"): _tpl_tier_restriction,

    # ── Fraud & Ban ──
    (NotifType.KOC_FLAGGED, "koc"): _tpl_koc_flagged,
    (NotifType.KOC_BANNED, "koc"): _tpl_koc_banned,
    (NotifType.MERCHANT_FLAGGED, "merchant"): _tpl_merchant_flagged,
    (NotifType.MERCHANT_BANNED, "merchant"): _tpl_merchant_banned,
    (NotifType.TASK_CANCELLED_FRAUD, "koc"): _tpl_task_cancelled_fraud,
    (NotifType.TASK_CANCELLED_FRAUD, "merchant"): _tpl_task_cancelled_fraud,
    (NotifType.FRAUD_ALERT, "admin"): _tpl_admin_fraud_alert,

    # ── Platform Announcement ──
    (NotifType.PLATFORM_ANNOUNCEMENT, "koc"): _tpl_platform_announcement,
    (NotifType.PLATFORM_ANNOUNCEMENT, "merchant"): _tpl_platform_announcement,

    # ── Scraper-specific (mapped to closest NotifType + sub-variant detection) ──
    # These share VIOLATION, CONTENT_REVISION, CONTENT_APPROVED ntypes
    # with sub-variant handling via kwargs
}


def render(ntype: str, role: str, **kwargs) -> dict:
    """
    Render notification content for a given notification type and user role.

    Args:
        ntype: Notification type (use NotifType constants or legacy string)
        role: User role ("koc", "merchant", or "admin")
        **kwargs: Template variables (product_name, koc_name, commission, etc.)

    Returns:
        dict with keys: in_app_title, in_app_message, email_subject, email_body
    """
    # ── Sub-variant detection ──
    # Review reminder: uses CONTENT_APPROVED ntype but with entity_name kwarg
    if ntype == NotifType.CONTENT_APPROVED and "entity_name" in kwargs:
        return _tpl_review_reminder(**kwargs)

    # Scraper sub-variant: CONTENT_APPROVED with views/likes → verified
    if ntype == NotifType.CONTENT_APPROVED and "views" in kwargs:
        return _tpl_koc_scraper_verified(**kwargs)

    # Scraper sub-variant: CONTENT_REVISION with error_msg → scrape failed once
    if ntype == NotifType.CONTENT_REVISION and "error_msg" in kwargs and "revisions_left" not in kwargs:
        return _tpl_koc_scrape_failed_once(**kwargs)

    # Merchant ship timeout: VIOLATION + role=merchant + violation_type not set
    if ntype == NotifType.VIOLATION and role == "merchant" and kwargs.get("violation_type") == "ship_timeout":
        return _tpl_merchant_ship_timeout(**kwargs)

    # Try exact dispatch
    tpl_fn = _DISPATCH.get((ntype, role))

    if tpl_fn:
        return tpl_fn(**kwargs)

    # Fallback: try with reversed role or generic
    # Some templates are shared across roles
    if not tpl_fn:
        # Try to find any template for this ntype
        for (n, r), fn in _DISPATCH.items():
            if n == ntype:
                tpl_fn = fn
                break

    if tpl_fn:
        return tpl_fn(**kwargs)

    # Ultimate fallback: return a generic notification
    title = kwargs.get("title", f"KOC Engine — {ntype}")
    message = kwargs.get("message", str(kwargs))
    return {
        "in_app_title": title,
        "in_app_message": message,
        "email_subject": title,
        "email_body": f"{message}\n\n{MISSION}\n\n{PLATFORM_URL}\n\n{SIGNATURE}",
    }
