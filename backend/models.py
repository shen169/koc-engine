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
    platform: str  # tiktok | instagram | xiaohongshu
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
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════
# 产品（新增）
# ═══════════════════════════════════════════

class Product(BaseModel):
    id: str = Field(default_factory=_uid)
    merchant_id: str
    asin: str = ""
    name: str
    image_url: str = ""
    category: str = ""
    commission_type: str = "discount_code"  # discount_code | affiliate
    commission_value: str = ""  # 如 "15% off"
    description: str = ""
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
    referral_code: str = ""  # 裂变追踪
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
# 任务/履约（PRD §7.3）
# ═══════════════════════════════════════════

class KocTask(BaseModel):
    id: str = Field(default_factory=_uid)
    koc_id: str
    merchant_id: str = ""       # 新增：关联商家
    product_id: str = ""        # 新增：关联产品
    product_asin: str = ""
    product_name: str = ""
    sample_status: str = "none"  # none | sent | received
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
    amount: int  # 正数=入账，负数=扣减
    type: str  # task_reward | referral_reward | manual | admin_adjust
    ref_id: str = ""  # 关联的任务/推荐 ID
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


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
# 裂变推荐
# ═══════════════════════════════════════════

class Referral(BaseModel):
    id: str = Field(default_factory=_uid)
    referrer_koc_id: str
    referred_email: str = ""
    referred_koc_id: str = ""
    referral_code: str
    status: str = "pending"  # pending | joined | completed
    reward_credits: int = 10
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: str = ""


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
VALID_REFERRAL_STATUSES = ["pending", "joined", "completed"]
VALID_PRODUCT_STATUSES = ["active", "paused", "archived"]
