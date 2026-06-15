# CLAUDE.md — KOC Engine

## 项目

跨境电商 KOC 双边撮合平台。商家上架产品 → 创作者申请入驻 → AI 评分定级 → 双方各自表达意向 → 平台匹配 → 任务履约 → 点数/佣金闭环。

核心规则：**双方互不可见联系方式**，平台是唯一中间人，代理全部沟通和履约管理。

## 技术栈

- 后端：Python 3.12 + FastAPI + uvicorn + httpx
- 前端：Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- AI：DeepSeek v4 (`deepseek-chat`，OpenAI 兼容 API)
- 存储：JSON 文件 + threading.Lock（`output/` 目录，与 TVS 模式一致）
- 认证：bcrypt + PyJWT（3 角色：koc / merchant / admin）
- 字体：Inter + JetBrains Mono (Google Fonts)

## 启动

```bash
# 后端（必须从 backend/ 目录启动，否则相对导入失败）
cd backend && source ../venv/bin/activate && uvicorn main:app --port 8001 --reload

# 前端
cd frontend && npm run dev
```

## 环境变量

后端 `backend/.env`：

| 变量 | 说明 | 必需 |
|------|------|:--:|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（AI 评分） | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ❌（默认 dev key） |
| `ACCESS_PASSWORD` | Admin 密码 | ❌（默认 admin123） |

## 三方角色

| | KOC | 商家 | Admin |
|------|:--:|:--:|:--:|
| 注册 | ✅ 需申请 | ✅ 开放 | 系统创建 |
| 浏览 KOC 池 | ✗ | ✅（匿名） | ✅ |
| 浏览产品池 | ✅ | 自己的 | ✅ |
| 表达意向 | ✅ 对产品 | ✅ 对 KOC | ✗ |
| 查看联系方式 | ✗ | ✗ | ✅ |
| 创建任务 | ✗ | ✗ | ✅ |
| 互评 | ✅ 评商家 | ✅ 评 KOC | ✗ |
| 黑名单 | ✅ | ✅ | ✅ |

## 完整工作流

```
商家注册 → 上架产品 → 浏览 KOC 池 → 对 KOC 点"有意向"
KOC 落地页 → 申请 → DeepSeek AI评分 → 审核通过 → 浏览产品池 → 对产品点"有意向"
    ↓ 双向绿灯
Admin 匹配 → 创建任务 → 寄样 → KOC 回传视频 → Admin 确认履约 → 自动发点数
    ↓
双方互评 + 双向黑名单 + 折扣码/裂变/佣金
```

## 项目结构

```
koc-engine/
├── backend/
│   ├── main.py                # FastAPI 入口 + CORS + 路由注册 + startup
│   ├── models.py              # 全部 Pydantic 模型（12 个实体 + 状态机常量）
│   ├── config.py              # 配置/常量（含 .env 加载）
│   ├── auth.py                # JWT 认证 + 角色依赖
│   ├── routes/                # 15 个路由模块
│   │   ├── auth_routes.py         # 注册/登录/me
│   │   ├── landing_routes.py      # 落地页数据（公开）
│   │   ├── application_routes.py  # KOC 申请 + AI 评分 + 审核 + 裂变奖励
│   │   ├── koc_routes.py          # KOC 档案 + 匿名池
│   │   ├── merchant_routes.py     # 商家档案
│   │   ├── product_routes.py      # 产品 CRUD + 角色视图
│   │   ├── interest_routes.py     # 意向表达 + 双向绿灯匹配
│   │   ├── task_routes.py         # 任务/履约 + 点数发放
│   │   ├── credit_routes.py       # 点数余额/流水/奖励
│   │   ├── coupon_routes.py       # 折扣码 + 订单 CSV 导入
│   │   ├── referral_routes.py     # KOC 裂变推荐
│   │   ├── review_routes.py       # 双向互评
│   │   ├── blacklist_routes.py    # 双向黑名单
│   │   ├── scoring_routes.py      # AI 评分端点
│   │   └── admin_routes.py        # 统计 + Cron 扫描
│   ├── stores/                # JSON 文件存储层（12 个 store）
│   ├── services/
│   │   ├── scorer.py          # DeepSeek v4 三维评分（mock 降级）
│   │   ├── cron.py            # Ghosted/Stale 扫描 + 信用分更新
│   │   ├── email_service.py   # 邮件模板（待接 gmail-assistant）
│   │   └── tvs_client.py      # TVS 集成占位（P2）
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # 公开首页（火花动画 + 三色渐变）
│   │   ├── koc/apply/page.tsx     # KOC 申请 + AI 评分结算动画
│   │   ├── login/page.tsx / register/page.tsx
│   │   ├── portal/                # KOC 门户（暖橙背景）
│   │   │   ├── page.tsx / products/ / tasks/[id]/ / credits/ / coupons/ / referrals/
│   │   ├── dashboard/             # 商家门户（浅紫背景）
│   │   │   ├── page.tsx / products/ / products/new/ / koc-pool/
│   │   └── admin/                 # 管理后台（中性灰背景）
│   │       ├── page.tsx / applications/ / koc/ / merchants/ / products/ / interests/ / tasks/
│   ├── components/
│   │   ├── Spark.tsx           # 火花符号（呼吸 + 弹入 + 匹配粒子）
│   │   ├── MatchModal.tsx      # 匹配成功弹窗
│   │   └── CoinDrop.tsx        # 点数到账动画
│   ├── lib/api.ts              # API 客户端（fetch 封装 + auth helpers）
│   └── middleware.ts            # Next.js 路由保护
├── output/                    # 运行时数据（gitignore）
├── docs/superpowers/specs/    # 设计文档
│   └── 2026-06-15-brand-brief.md  # 品牌规范
└── CLAUDE.md
```

## 关键设计决策

1. **user_id ≠ koc_profile_id**：KOC 注册（users 表）和 KOC 档案（koc_profiles 表）是两个独立实体。关联方式：email。task 里存的是 profile_id，鉴权和点数发放需通过 email 桥接到 user_id。`task_routes.py` 中的 `_get_koc_user_id()` 做这个桥接。

2. **匿名 KOC 池**：`GET /api/koc/pool` 返回商家视角的 KOC 列表，不含 email/profile_url，只展示匿名代号 + tier + 评分 + 品类。

3. **双向绿灯**：`interest_store.find_mutual()` —— KOC 对产品有意向 + 该产品商家对该 KOC 有意向 = 平台看到匹配候选。

4. **点数闭环**：初始 30 点 → 完成履约 +30 点 → 点数只发到 user 账户（不是 profile）。信用分默认 100，Ghosted 扣 30。

5. **AI 评分降级**：DeepSeek API 不可用时自动降级为 mock 分数（基于 handle 的 hash），不阻塞申请流程。

6. **存储模式**：每个 Store 用 `threading.Lock() + JSON 文件`，照搬 tvs-video-tool 的 `FileTaskStore` 模式。无数据库依赖。

7. **Brand**：活力社交方向 — Pink→Purple 渐变、Inter 字体、胶囊按钮、火花符号 ✦、四角色分色背景。

## API 端点速查

| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/auth/register` | ✗ | 注册（选 koc/merchant 角色） |
| POST | `/api/auth/login` | ✗ | 登录 → JWT |
| GET | `/api/auth/me` | ✅ | 当前用户 + 角色 + 点数 |
| GET | `/api/landing/stats` | ✗ | 落地页数据 |
| POST | `/api/applications` | ✗ | KOC 申请 → 自动 AI 评分 |
| PUT | `/api/applications/{id}/decision` | 🔒 | 审核 approve/reject/watch |
| GET | `/api/koc/pool` | ✅ | 商家匿名浏览 KOC |
| POST | `/api/products` | ✅ | 商家上架产品 |
| GET | `/api/products` | ✅ | 产品列表（按角色返回不同视图） |
| POST | `/api/interests` | ✅ | 表达意向 |
| GET | `/api/interests/matches` | 🔒 | 双向绿灯列表 |
| PUT | `/api/interests/{id}/match` | 🔒 | Admin 确认匹配 |
| POST | `/api/tasks` | 🔒 | 创建任务 |
| PUT | `/api/tasks/{id}/submit` | ✅ | KOC 回传视频 |
| PUT | `/api/tasks/{id}/confirm` | 🔒 | 确认履约 → 自动发点数 |
| POST | `/api/reviews` | ✅ | 双向互评 |
| POST | `/api/blacklist` | ✅ | 拉黑 |
| POST | `/api/coupons` | 🔒 | 生成折扣码 |
| POST | `/api/coupons/batch-import` | 🔒 | CSV 订单导入 |
| GET | `/api/referrals/code` | ✅ | 获取推荐码 |
| POST | `/api/admin/cron/scan` | 🔒 | 手动触发周度扫描 |
| GET | `/api/admin/stats` | 🔒 | 仪表盘统计 |

✅ = KOC/商家登录即可 &nbsp; 🔒 = admin only

## 注意事项

- 后端必须从 `backend/` 目录启动（`uvicorn main:app`），否则 `from config import ...` 等绝对导入找不到模块
- `backend/.env` 由 config.py 手动加载（不用 python-dotenv），只支持 `KEY=VALUE` 格式
- KOC 的 user_id（users 表）和 koc_id（koc_profiles 表）不同，task 鉴权/点数发放必须做 email 桥接
- 前端 API 调用直连 `http://localhost:8001`（`NEXT_PUBLIC_API_URL` 环境变量），不走 Next.js 代理
- Tailwind v4 使用 CSS-based `@theme` 配置，不是 `tailwind.config.ts`
- 火花粒子动画使用 CSS custom properties（`--tx` / `--ty`）做方向控制
