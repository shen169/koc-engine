"""KOC Engine · FastAPI 主入口"""

import asyncio
import re
import bcrypt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ADMIN_EMAIL, ADMIN_PASSWORD, OUTPUT_DIR
from stores.user_store import user_store
from stores.credit_store import credit_store
from models import User

import os

app = FastAPI(title="KOC Engine", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^(http://localhost:\d+"
        r"|http://127\.0\.0\.1:\d+"
        r"|https://koc-engine\.vercel\.app"
        r"|https://koc-engine-[a-zA-Z0-9-]+\.vercel\.app"
        r"|https://koc-engine-[a-zA-Z0-9-]+-shen169s-projects\.vercel\.app)$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 启动初始化 ──────────────────────────────

@app.on_event("startup")
async def startup():
    """创建 admin 用户 + 输出目录 + 启动 cron 定时器"""
    for sub in ["users", "merchants", "koc_profiles", "applications", "products",
                 "interests", "tasks", "credits", "coupons", "referrals", "reviews", "blacklist"]:
        os.makedirs(os.path.join(OUTPUT_DIR, sub), exist_ok=True)

    existing = user_store.get_by_email(ADMIN_EMAIL)
    if not existing:
        admin = User(
            email=ADMIN_EMAIL,
            password_hash=bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode(),
            role="admin",
        )
        user_store.create(admin)
        credit_store.set_initial_balance(admin.id, 9999)

    # 启动 cron 定时器（每小时执行一次超时检测）
    asyncio.create_task(_cron_loop())


async def _cron_loop():
    """后台每小时跑一次超时扫描"""
    from services.cron import run_weekly_scan
    while True:
        await asyncio.sleep(3600)  # 每小时
        try:
            result = run_weekly_scan()
            if any(v for k, v in result.items() if k != "trust_threshold_alerts" and v):
                print(f"[cron] Scan: { {k: v for k, v in result.items() if v} }")
        except Exception as e:
            print(f"[cron] Error: {e}")


# ── 健康检查 ────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "koc-engine"}


# ── 注册路由（延迟导入，避免循环依赖）───────

from routes.auth_routes import router as auth_router
from routes.landing_routes import router as landing_router
from routes.application_routes import router as application_router
from routes.koc_routes import router as koc_router
from routes.merchant_routes import router as merchant_router
from routes.product_routes import router as product_router
from routes.interest_routes import router as interest_router
from routes.task_routes import router as task_router
from routes.credit_routes import router as credit_router
from routes.coupon_routes import router as coupon_router
from routes.referral_routes import router as referral_router
from routes.review_routes import router as review_router
from routes.blacklist_routes import router as blacklist_router
from routes.scoring_routes import router as scoring_router
from routes.admin_routes import router as admin_router
from routes.notification_routes import router as notification_router
from routes.matching_routes import router as matching_router

app.include_router(auth_router, prefix="/api")
app.include_router(landing_router, prefix="/api")
app.include_router(application_router, prefix="/api")
app.include_router(koc_router, prefix="/api")
app.include_router(merchant_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(interest_router, prefix="/api")
app.include_router(task_router, prefix="/api")
app.include_router(credit_router, prefix="/api")
app.include_router(coupon_router, prefix="/api")
app.include_router(referral_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(blacklist_router, prefix="/api")
app.include_router(scoring_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(notification_router, prefix="/api")
