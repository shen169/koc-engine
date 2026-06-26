"""JWT 认证中间件 — 复用 TVS auth 模式"""

from fastapi import Request, HTTPException
from jose import jwt, JWTError
from config import JWT_SECRET, JWT_ALGORITHM
from datetime import datetime, timedelta, timezone


def create_token(user_id: str, email: str, role: str) -> str:
    """生成 JWT token"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=72),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """解密 JWT，失败抛 401"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(request: Request) -> dict:
    """FastAPI 依赖——从 Authorization header 提取当前用户"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    return decode_token(auth[7:])


def require_role(*roles: str):
    """工厂函数——生成角色校验依赖"""
    async def checker(request: Request) -> dict:
        user = await get_current_user(request)
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
        return user
    return checker


# 常用依赖
require_koc = require_role("koc", "admin")
require_merchant = require_role("merchant", "admin")
require_admin = require_role("admin")
