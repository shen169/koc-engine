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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(os.path.dirname(BASE_DIR), "output")

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "koc-engine-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# DeepSeek AI (OpenAI-compatible)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Admin
ADMIN_EMAIL = "admin@koc-engine.internal"
ADMIN_PASSWORD = os.getenv("ACCESS_PASSWORD", "admin123")

# 点数
DEFAULT_INITIAL_CREDITS = 50       # KOC 注册初始点数（够接 3 单：每单 15 点=5平台费+10质押）
DEFAULT_TASK_REWARD_CREDITS = 30   # 完成一次履约奖励
DEFAULT_REFERRAL_REWARD_CREDITS = 10  # 推荐成功奖励

# AI 评分阈值
SCORE_THRESHOLD_REJECT = 60   # <60 自动婉拒
SCORE_THRESHOLD_L2 = 65       # ≥65 → L2
SCORE_THRESHOLD_L3 = 80       # ≥80 → L3

# Platform
PLATFORM_SERVICE_FEE = 5          # 商家每发一个任务固定扣点（平台服务费）
KOC_PLATFORM_FEE = 5              # KOC 每接一个 slot 固定扣点（平台服务费）
PLEDGE_PER_SLOT = 10              # 双方每 slot 质押点数（商家=10×KOC人数，KOC=10）
PLATFORM_PROFIT_RATE = 0.15       # 平台抽佣率（备用）

# Cron
GHOSTED_GRACE_DAYS = 14       # due_at 过期后宽限天数
STALE_DAYS = 30               # 无活动标记 stale
