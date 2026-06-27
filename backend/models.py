"""KOC Engine — 全量数据模型"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


def _uid() -> str:
    return uuid.uuid4().hex[:12]


# ═══════════════════════════════════════════
# 用户
# ═══════════════════════════════════════════

class User(BaseModel):
    id: str = Field(default_factory=_uid)
    email: str
    password_hash: str
    role: str  # koc | merchant | admin
    registration_ip: str = ""  # 注册时 IP，用于防同 IP 双角色
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserRegister(BaseModel):
    email: str
    password: str
    role: str  # koc | merchant


class UserLogin(BaseModel):
    email: str
    password: str


# ═══════════════════════════════════════════
# KOC 档案（PRD §7.1）
# ═══════════════════════════════════════════

class KocProfile(BaseModel):
    id: str = Field(default_factory=_uid)
    platform: str  # tiktok|douyin|instagram|youtube|xiaohongshu|x|facebook|pinterest|snapchat|linkedin|twitch|threads|likee|kwai|triller|clapper
    handle: str
    display_name: str = ""
    profile_url: str = ""
    follower_count: int = 0
    avg_likes: int = 0
    region: str = ""
    email: str = ""
    niche_tags: List[str] = Field(default_factory=list)
    score_authenticity: int = 0
    score_niche: int = 0
    score_engagement: int = 0
    score_total: int = 0
    score_reason: str = ""
    tier: str = "L1"  # L1 | L2 | L3
    source_engine: str = "inbound"  # inbound | outbound
    source_keyword: str = ""
    source_video_url: str = ""
    status: str = "Applied"  # 统一状态机
    trust_score: int = 100
    coupon_code: str = ""
    is_blacklisted: bool = False
    avg_rating: float = 0.0
    total_collaborations: int = 0
    completed_tasks: int = 0
    # ── 内容表现聚合 ──
    performance_score: float = 0.0     # 综合内容表现分 (0-100, log-scale 归一化)
    total_engagement: int = 0          # 累计互动数 (likes+comments+shares+saves)
    total_content_posts: int = 0       # 有表现数据的帖子数
    discovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_scanned_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 商家档案（新增）
# ═══════════════════════════════════════════

class Merchant(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    company_name: str = ""
    website: str = ""
    amazon_storefront: str = ""
    product_categories: List[str] = Field(default_factory=list)
    avg_rating: float = 0.0
    total_collaborations: int = 0
    is_blacklisted: bool = False
    # ── V2 新增：诚信度体系 ──
    trust_score: int = 100           # 诚信度 0-100，默认 100
    tier: str = "M1"                 # M1｜M2｜M3（商家诚信等级）
    total_tasks_completed: int = 0   # 累计完成（恢复诚信度用）
    total_tasks_disputed: int = 0    # 累计争议数
    target_markets: List[str] = Field(default_factory=list)  # 商家经营的目标市场
    lark_webhook_url: str = ""        # 飞书 Bot webhook（可选，商家自行配置）
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 产品（新增）
# ═══════════════════════════════════════════

class Product(BaseModel):
    id: str = Field(default_factory=_uid)
    merchant_id: str
    asin: str = ""  # legacy: Amazon ASIN (kept for backward compat)
    product_id: str = ""  # generic product identifier (ASIN, SKU, Handle, URL)
    sales_platform: str = ""  # amazon | shopify | walmart | ebay | etsy | shopee | temu | aliexpress | independent | other
    name: str
    image_url: str = ""
    category: str = ""
    commission_type: str = ""  # DEPRECATED: V2 uses platform points, set at task level
    commission_value: str = ""  # DEPRECATED: V2 uses platform points, set at task level
    commission_link: str = ""  # DEPRECATED: V2 uses platform points, set at task level
    description: str = ""
    target_market: str = ""  # target market (US/UK/CA/AU/EU/JP/KR/SEA/CN), matched with KOC.region
    status: str = "active"  # active | paused | archived
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 申请（PRD §7.2）
# ═══════════════════════════════════════════

class Application(BaseModel):
    id: str = Field(default_factory=_uid)
    koc_id: Optional[str] = None  # 审核通过后绑定
    raw_form: dict = Field(default_factory=dict)
    campaign: str = ""
    ai_score: int = 0
    ai_reason: str = ""
    decision: str = "pending"  # pending | approved | rejected | watching
    applied_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 意向 + 匹配（新增）
# ═══════════════════════════════════════════

class Interest(BaseModel):
    id: str = Field(default_factory=_uid)
    from_role: str  # koc | merchant
    from_id: str    # koc_id 或 merchant_id
    to_id: str      # product_id 或 koc_id
    to_type: str    # product | koc
    status: str = "expressed"  # expressed | matched | declined | completed
    matched_by: str = ""
    matched_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 任务/履约 V2 — 批量 KOC + 质押 + 全状态机
# ═══════════════════════════════════════════

class KocTask(BaseModel):
    id: str = Field(default_factory=_uid)
    merchant_id: str = ""
    product_id: str = ""
    product_asin: str = ""
    product_name: str = ""

    # ── V2 新增：任务类型 + 状态 ──
    task_type: str = "urgent"       # urgent | long_term
    task_status: str = "pending"    # pending|assigned|accepted|shipped|creating|completed|disputed

    # ── V2 新增：批量 KOC ──
    koc_required: int = 1           # 需要几个 KOC
    koc_slots: list = Field(default_factory=list)
    # 每个 slot: {koc_id, status, assigned_at, accepted_at, shipped_at, received_at,
    #             submitted_at, tracking_number, content_urls, content_data,
    #             pledge_paid, commission_paid, reject_count}

    # ── V2 新增：质押 + 佣金 ──
    task_mode: str = "commission"   # "commission" | "sample"（寄样模式：无佣金，KOC 只拿免费产品）
    pledge_merchant: int = 0        # 商家佣金池（不退，= commission × koc_required，发布时一次扣完）
    pledge_koc: int = 0             # KOC 质押点（佣金模式10pt/寄样模式5pt，完成全额退还 bonus，违约不退）
    commission: int = 0             # 每 KOC 佣金（pt），商家发布时设定，KOC 完成后从佣金池中实收

    # ── V2 新增：物流 ──
    tracking_number: str = ""
    carrier: str = ""                    # FedEx, DHL, USPS, SF-Express, etc.
    shipping_proof_urls: list = Field(default_factory=list)  # 发货凭证照片/截图

    # ── V2 新增：内容 ──
    content_urls: list = Field(default_factory=list)

    # ── 保留（兼容） ──
    koc_id: str = ""                # deprecated，用 koc_slots
    sample_status: str = "none"
    deposit_paid: bool = False
    deposit_amount_usd: float = 0.0
    submit_url: str = ""
    due_at: str = ""
    delivered: bool = False
    refunded: bool = False
    credits_reward: int = 0
    credits_rewarded: bool = False
    credits_consumed: int = 0
    tvs_task_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 点数
# ═══════════════════════════════════════════

class CreditTransaction(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    amount: int  # positive=credit, negative=debit
    type: str  # registration_bonus | pledge | pledge_return | platform_fee | content_fee | manual_topup | withdrawal | admin_adjust
    ref_id: str = ""  # associated task/transaction ID
    note: str = ""
    withdrawable: bool = False  # True = withdrawable pts, False = bonus pts
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 提现工单
# ═══════════════════════════════════════════

class WithdrawalRequest(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    amount: int
    status: str = "pending"  # pending | paid | rejected
    payment_method: str = ""  # paypal | bank_transfer | other
    payment_account: str = ""  # PayPal email / bank account
    admin_note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    processed_at: str = ""


# ═══════════════════════════════════════════
# 折扣码
# ═══════════════════════════════════════════

class CouponCode(BaseModel):
    id: str = Field(default_factory=_uid)
    koc_id: str
    code: str  # 如 JOJO20
    product_asin: str = ""
    discount_percent: int = 15
    usage_count: int = 0
    total_revenue: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CouponOrder(BaseModel):
    order_id: str
    coupon_id: str
    amount: float
    date: str


# ═══════════════════════════════════════════
# 双向互评（新增）
# ═══════════════════════════════════════════

class Review(BaseModel):
    id: str = Field(default_factory=_uid)
    task_id: str
    reviewer_role: str  # koc | merchant
    reviewer_id: str
    target_id: str      # 被评的 koc_id 或 merchant_id
    rating: int = 5     # 1-5
    dimensions: dict = Field(default_factory=dict)  # 各维度评分
    comment: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 黑名单（新增）
# ═══════════════════════════════════════════

class BlacklistEntry(BaseModel):
    id: str = Field(default_factory=_uid)
    created_by_role: str  # koc | merchant | admin
    created_by_id: str
    target_role: str      # koc | merchant
    target_id: str
    reason: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 内容表现数据（KOC 提交 / 平台采集）
# ═══════════════════════════════════════════

class ContentMetrics(BaseModel):
    """KOC 单条内容的表现指标。存储在 slot.content_data 中。"""
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    clicks: int = 0              # 返佣链接点击
    conversions: int = 0          # 成交转化数
    revenue: float = 0.0          # 归因收入
    engagement_rate: float = 0.0   # (likes+comments+shares+saves)/views*100，服务端计算
    platform: str = ""            # tiktok|douyin|instagram|youtube|xiaohongshu|x|facebook|pinterest|snapchat|linkedin|twitch|threads|likee|kwai|triller|clapper
    last_updated: str = ""        # ISO timestamp


# ═══════════════════════════════════════════
# AI 评分
# ═══════════════════════════════════════════

class ScoringRequest(BaseModel):
    handle: str
    platform: str
    follower_count: int = 0
    video_links: List[str] = Field(default_factory=list)
    niche: str = ""


class ScoringResult(BaseModel):
    authenticity: int
    niche: int
    engagement: int
    total: int
    tier: str
    reason: str


# ═══════════════════════════════════════════
# 举报
# ═══════════════════════════════════════════

class Report(BaseModel):
    id: str = Field(default_factory=_uid)
    reported_entity_type: str  # "merchant" | "koc"
    reported_entity_id: str
    reporter_user_id: str
    reporter_role: str  # "koc" | "merchant"
    task_id: str = ""
    reason: str = ""
    status: str = "pending"  # pending | approved | rejected
    reviewed_by: str = ""
    reviewed_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 状态机常量
# ═══════════════════════════════════════════

VALID_STATUSES = [
    "Discovered", "Scored", "Contacted", "Replied",
    "Applied", "Approved", "SampleSent", "Submitted",
    "Delivered", "Ghosted", "Collaborating", "Upgraded",
]

VALID_TIERS = ["L1", "L2", "L3"]
VALID_ROLES = ["koc", "merchant", "admin"]
VALID_DECISIONS = ["pending", "approved", "rejected", "watching"]
VALID_INTEREST_STATUSES = ["expressed", "matched", "declined", "completed"]
VALID_PRODUCT_STATUSES = ["active", "paused", "archived"]

# ── V2 任务状态机 ──
TASK_TYPES = ["urgent", "long_term"]
TASK_STATUSES = ["pending", "assigned", "accepted", "shipped", "creating", "completed", "disputed"]
SLOT_STATUSES = ["pending", "assigned", "accepted", "shipped", "received", "creating", "submitted", "approved", "revision_requested", "completed", "rejected", "timed_out"]
VALID_WITHDRAWAL_STATUSES = ["pending", "paid", "rejected"]


# ═══════════════════════════════════════════
# 通知（V2.3 新增）
# ═══════════════════════════════════════════
class Notification(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str                              # 接收人 user_id
    type: str = ""                            # task_accepted | task_shipped | content_submitted | content_reviewed | koc_matched | interest | auto_approved | deadline | violation
    title: str = ""
    message: str = ""
    task_id: str = ""                         # 可选关联任务
    resource_path: str = ""                   # 前端跳转路径 e.g. /portal/tasks/xxx
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
