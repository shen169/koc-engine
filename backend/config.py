"""KOC Engine 配置"""

import os

# 加载 .env 文件
_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_ENV_FILE):
    with open(_ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

# 路径
# OUTPUT_DIR: 优先用环境变量（Docker 部署强制设为 /output），否则自动推算
# ⚠️ 必须与 docker-compose.yml 的 volume mount 保持一致
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.getenv("OUTPUT_DIR") or os.path.join(os.path.dirname(BASE_DIR), "output")

# JWT — must be set via env var in production; dev fallback auto-generated per session
_JWT_FALLBACK = os.urandom(32).hex() if not os.getenv("JWT_SECRET") else ""
JWT_SECRET = os.getenv("JWT_SECRET", _JWT_FALLBACK or "koc-engine-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# DeepSeek AI (OpenAI-compatible)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Admin
ADMIN_EMAIL = "honghuishen24@gmail.com"
ADMIN_PASSWORD = os.getenv("ACCESS_PASSWORD", "admin123")

# 点数
DEFAULT_KOC_INITIAL_CREDITS = 200      # KOC 注册初始点数
DEFAULT_MERCHANT_INITIAL_CREDITS = 100  # 商家注册初始点数
DEFAULT_TASK_REWARD_CREDITS = 30        # 完成一次履约奖励

# AI 评分阈值
SCORE_THRESHOLD_REJECT = 60   # <60 自动婉拒
SCORE_THRESHOLD_L2 = 65       # ≥65 → L2
SCORE_THRESHOLD_L3 = 80       # ≥80 → L3

# Platform
PLATFORM_SERVICE_FEE = 5          # 商家每发一个任务固定扣点（平台服务费，不退）
KOC_PLATFORM_FEE_RATE = 0.10     # KOC 每完成一个 slot 平台抽佣比例（10%）
KOC_PLATFORM_FEE_MIN = 1          # 平台抽成最低 1pt
# KOC_FIXED_PLEDGE = 10           # V2.6 废弃 — 佣金模式质押改为 = 佣金金额
KOC_PLEDGE_SAMPLE = 5             # KOC 样品模式质押点（无佣金，固定 5pt）
PT_TO_USD = 1.0                   # 点数兑美金汇率：1pt = $1 USD

# Anti-fraud
KOC_REGISTRATION_IP_LIMIT = 2              # 同 IP 最多注册 KOC 数（7 天内）
KOC_REGISTRATION_IP_WINDOW_DAYS = 7        # IP 限频窗口期
MERCHANT_REGISTRATION_IP_LIMIT = 1         # 同 IP 最多注册 1 个商家

# Commission — V2.6 tier-gated (打怪升级)
TASK_COMMISSION_MIN = 20           # 商家发布任务最低佣金（全局下限，向后兼容）
TASK_COMMISSION_MAX = 50           # 商家发布任务最高佣金（全局上限，向后兼容）

TIER_COMMISSION_MAX = {            # 各等级佣金上限
    "L1": 0, "L2": 50, "L3": 500,
    "M1": 0, "M2": 50, "M3": 500,
}
TIER_COMMISSION_MIN = {            # 各等级佣金下限
    "L1": 0, "L2": 20, "L3": 20,
    "M1": 0, "M2": 20, "M3": 20,
}

# Tier-gated concurrency
TIER_MAX_ACTIVE_SLOTS = {"L1": 2, "L2": 3, "L3": 5}      # KOC 各等级最大并行任务数
TIER_MAX_KOC_REQUIRED = {"M1": 2, "M2": 3, "M3": 10}      # 商家各等级最多招募 KOC 数

# Tier upgrade thresholds (打怪升级条件)
TIER_UPGRADE_TASKS = {"L1_to_L2": 3, "L2_to_L3": 5, "M1_to_M2": 3, "M2_to_M3": 5}
TIER_UPGRADE_MIN_RATING = 3.0                             # 升级最低均分
TIER_UPGRADE_MIN_TRUST = 55                               # L2→L3 / M2→M3 最低信任分

# Withdrawal
KOC_WITHDRAWAL_MIN_COMPLETIONS = 3   # KOC 提现最低完成单数
KOC_WITHDRAWAL_MIN_BALANCE = 100     # KOC 提现最低 withdrawable 余额
KOC_WITHDRAWAL_DAILY_MAX = 500       # KOC 单日提现上限

# Apify
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN", "")
SCRAPE_DELAY_HOURS = 24  # KOC 提交内容后多久抓取数据（给内容自然起量的窗口期）

# Cron
GHOSTED_GRACE_DAYS = 14       # due_at 过期后宽限天数
STALE_DAYS = 30               # 无活动标记 stale

# SLA: 内容审核超时
SLA_CONTENT_REVIEW_DAYS = 3   # 商家审核 KOC 提交内容超时 → 自动通过
SLA_REVISION_DAYS = 3          # KOC 驳回后修改超时 → 按违约处理
MAX_REVISIONS = 1             # KOC 最多修改重提交次数（1 次，第 2 次 reject 触发 AI 终审）

# V2.6: 长线任务 SLA（打怪升级 — 给新手更多时间）
SLA_LONG_TERM_IDLE_DAYS = 30          # 长线任务空位 30 天无人认领才提醒（was 7）
SLA_LONG_TERM_WARN_1_DAYS = 15        # 第 15 天首次提醒
SLA_LONG_TERM_WARN_2_DAYS = 25        # 第 25 天二次提醒
SLA_SUBMIT_DAYS_LONG_TERM = 21        # 长线任务提交时间（was 14）

# ═══════════════════════════════════════════
# 通知类型常量（V2.3 统一枚举）
# ═══════════════════════════════════════════
class NotifType:
    """通知类型枚举 — 所有 notify_user() 调用必须使用这些常量"""
    TASK_ACCEPTED = "task_accepted"           # KOC 接受任务
    TASK_DECLINED = "task_declined"           # KOC 拒绝任务
    TASK_SHIPPED = "task_shipped"             # 商家已发货
    RECEIPT_CONFIRMED = "receipt_confirmed"   # KOC 确认收货
    RECEIPT_AUTO = "receipt_auto"             # 自动收货（物流跟踪）
    CONTENT_SUBMITTED = "content_submitted"   # KOC 提交内容
    CONTENT_APPROVED = "content_approved"     # 内容审核通过
    CONTENT_REVISION = "content_revision"     # 内容需修改
    CONTENT_AI_OVERRULE = "content_ai_overrule"  # AI 终审推翻
    AUTO_APPROVED = "auto_approved"           # 超时自动通过
    VIOLATION = "violation"                   # 违约通知
    APPLICATION_APPROVED = "application_approved"  # KOC 申请通过
    INTEREST_RECEIVED = "interest_received"   # 收到意向表达
    KOC_MATCHED = "koc_matched"               # KOC 被匹配
    TIER_CHANGED = "tier_changed"             # 等级变更
    TASK_REMATCHED = "task_rematched"         # 长期空位重匹配
    DEADLINE_WARNING = "deadline_warning"     # SLA 截止预警
    PLATFORM_ANNOUNCEMENT = "platform_announcement"  # 平台公告
    TASK_IDLE_WARNING = "task_idle_warning"       # 长线任务 7 天空位提醒商家
    TASK_DELETED = "task_deleted"                 # 任务被商家删除（含退款）

    # ── V2.5 反欺诈红线执法通知 ──
    FRAUD_ALERT = "fraud_alert"                   # Admin 收到欺诈告警
    MERCHANT_FLAGGED = "merchant_flagged"          # 商家被标记虚假（第 1 次，可整改）
    MERCHANT_BANNED = "merchant_banned"            # 商家被永久封禁（第 2 次）
    KOC_FLAGGED = "koc_flagged"                    # KOC 被标记虚假（第 1 次，可整改）
    KOC_BANNED = "koc_banned"                      # KOC 被永久封禁（第 2 次）
    TASK_CANCELLED_FRAUD = "task_cancelled_fraud"  # 任务因欺诈被取消

    # ── V2.6 打怪升级 ──
    TIER_UPGRADED = "tier_upgraded"               # 等级升级（L1→L2 / M1→M2 等）
    TIER_RESTRICTION = "tier_restriction"          # 操作被等级限制拦截
