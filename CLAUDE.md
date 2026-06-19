# CLAUDE.md — KOC Engine

## 项目

跨境电商 KOC 双边撮合平台 V2。

**核心变化（V1→V2）：** 从 Admin 手动匹配 → **自动接单 + 任务广场 + 质押经济**。
- 商家发布任务（加急自动匹配 / 长线进广场）
- KOC 在任务广场接单 或 对产品点意向自动分配
- 双方质押扣点 → 履约完成退还（扣 5pt 平台费）
- 佣金走返佣链接（affiliate link），平台点数不参与佣金发放

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
| `DEEPSEEK_API_KEY` | DeepSeek API Key（AI 评分 + 匹配精排） | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ❌（默认 dev key） |
| `ACCESS_PASSWORD` | Admin 密码 | ❌（默认 admin123） |

## 三方角色

| | KOC | 商家 | Admin |
|------|:--:|:--:|:--:|
| 注册 | ✅ 需申请 | ✅ 开放 | 系统创建 |
| 浏览 KOC 池 | ✗ | ✅（匿名） | ✅ |
| 浏览任务广场 | ✅ | ✗ | ✅ |
| 浏览产品池 | ✅ | 自己的 | ✅ |
| 发布任务 | ✗ | ✅（信任≥40） | ✅ |
| 接受任务 | ✅（上限5个） | ✗ | ✅ |
| 表达意向 | ✅ → 自动接单 | ✅ 对 KOC | ✗ |
| 查看联系方式 | ✗ | ✗ | ✅ |
| 双向互评 | ✅ 评商家 | ✅ 评 KOC | ✗ |
| 举报 | ✅ 举报商家 | ✗ | ✅ 审核举报 |
| 黑名单 | ✅ | ✅ | ✅ |

## 完整工作流（V2）

```
商家注册(5000pt) → 创建profile → 上架产品(含返佣链接) → 发布任务
    ├─ 加急(urgent): 自动匹配引擎填充 KOC slot → assigned
    └─ 长线(long_term): 创建空槽 → 进入任务广场等待 KOC 浏览接单

KOC 落地页 → 申请(严格校验+AI评分) → Admin审核 → 通过(1000pt) → 浏览任务广场+产品池
    ├─ 任务广场接单: 浏览→接受→扣质押(10pt)
    └─ 产品点意向: 自动填已有空槽 或 创建 long_term 任务

双方质押扣点 → 商家发货(上传物流+承运商+凭证照片) → 物流追踪(自动查询送达→自动收货) → KOC收货(含开箱照) → 创作 → 提交内容链接
    ↓ 进入待审核状态（不再自动完成！）
商家审核 KOC 提交内容:
    ├─ approve → 退双方质押 + 恢复信任分(+3) + 校准等级 ✅
    ├─ reject → KOC 修改重交（最多3次，超限→违约）
    └─ 4天未审 → cron 自动通过（保护 KOC 不被恶意拖延）
佣金: 走返佣链接(affiliate link) 自动结算，不走平台点数
双方互评

Cron 周度扫描(每小时执行；物流追踪每24h):
├─ 超时检测: 接单12h→重推 | 发货48h→商家违约(退KOC质押+扣商家分) | 提交14d→KOC违约(退商家质押+扣KOC分)
├─ 审核超时: submitted 4d未审→自动通过 | revision_requested 3d未重交→KOC违约
├─ 物流追踪: 每日查询所有 shipped slot → 送达自动收货
├─ 长线空位: 7天无人接→系统自动匹配填槽
└─ 信任分联动: 完成/违约/举报→信任分变化→等级自动校准(L1⇄L2⇄L3 / M1⇄M2⇄M3)
```

## 项目结构

```
koc-engine/
├── backend/
│   ├── main.py                # FastAPI 入口 + CORS + 路由注册 + cron loop
│   ├── models.py              # 全部 Pydantic 模型 (12 实体 + 状态机常量)
│   ├── config.py              # 配置/常量/点数/质押/费用/SLA (.env 手动加载)
│   ├── auth.py                # JWT 认证 + 角色依赖 (require_koc/merchant/admin)
│   ├── routes/                # 16 个路由模块
│   │   ├── auth_routes.py         # 注册/登录/me (返回信任分+等级+点数)
│   │   ├── landing_routes.py      # 落地页数据 (公开)
│   │   ├── application_routes.py  # KOC 申请 + AI评分 + 严格校验 + 裂变
│   │   ├── koc_routes.py          # KOC 档案 + 匿名池 (商家视角)
│   │   ├── merchant_routes.py     # 商家档案 + 诚信度查询 + 举报返佣链接
│   │   ├── product_routes.py      # 产品 CRUD + 角色视图 (KOC看active+商家信息)
│   │   ├── interest_routes.py     # 意向表达 → 自动接单 (核心流转)
│   │   ├── matching_routes.py     # 智能匹配: 为产品找KOC / 为KOC找产品 / 批量意向
│   │   ├── task_routes.py         # 任务V2: 发布/广场/接单/拒绝/发货/收货/提交/报表/重推
│   │   ├── credit_routes.py       # 点数余额/流水/Admin发点
│   │   ├── coupon_routes.py       # 折扣码 + CSV批量导入订单
│   │   ├── referral_routes.py     # KOC 裂变推荐码/统计
│   │   ├── review_routes.py       # 双向互评 (履约后)
│   │   ├── blacklist_routes.py    # 双向黑名单
│   │   ├── scoring_routes.py      # AI 评分独立调用
│   │   └── admin_routes.py        # 统计/Cron/举报审核/用户列表
│   ├── stores/                # JSON 文件存储层 (14 个 store)
│   │   ├── user_store.py / koc_store.py / merchant_store.py
│   │   ├── product_store.py / task_store.py / application_store.py
│   │   ├── interest_store.py / credit_store.py / coupon_store.py
│   │   ├── referral_store.py / review_store.py / blacklist_store.py
│   │   └── report_store.py   # 举报工单存储
│   ├── services/
│   │   ├── scorer.py          # DeepSeek v4 三维评分 (mock 降级)
│   │   ├── matcher.py         # 匹配引擎: 规则引擎 (7维加权) + AI 精排
│   │   ├── cron.py            # 周度扫描: 超时检测 + 自动处理 + 信任分联动 + 等级校准
│   │   ├── tracking.py        # 物流追踪: 多承运商自动查询 + 送达自动收货
│   │   ├── email_service.py   # 邮件模板 (占位)
│   │   └── tvs_client.py      # TVS 集成占位 (P2)
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # 公开首页 (火花动画 + 三色渐变)
│   │   ├── koc/apply/page.tsx     # KOC 申请 + AI评分结算动画
│   │   ├── login/page.tsx / register/page.tsx
│   │   ├── portal/                # KOC 门户 (暖橙背景)
│   │   │   ├── page.tsx / products/ / products/[id]/
│   │   │   ├── hall/              # 任务广场 (浏览+筛选+排序+接单)
│   │   │   ├── tasks/ / tasks/[id]/
│   │   │   ├── credits/ / coupons/ / referrals/
│   │   ├── dashboard/             # 商家门户 (浅紫背景)
│   │   │   ├── page.tsx / products/ / products/new/ / koc-pool/
│   │   │   ├── tasks/ / tasks/new/ / tasks/[id]/
│   │   └── admin/                 # 管理后台 (中性灰背景)
│   │       ├── page.tsx / applications/ / koc/ / merchants/
│   │       ├── products/ / interests/ / tasks/ / credits/
│   ├── components/
│   │   ├── Spark.tsx           # 火花符号 (呼吸 + 弹入 + 匹配粒子)
│   │   ├── MatchModal.tsx      # 匹配成功弹窗
│   │   ├── CoinDrop.tsx        # 点数到账动画
│   │   ├── TaskCard.tsx        # 任务卡片 (广场/列表复用)
│   │   ├── TaskProgress.tsx    # 任务状态进度条
│   │   ├── IntegrityBadge.tsx  # 诚信度徽章 (M1/M2/M3 + L1/L2/L3)
│   │   └── NavBar.tsx          # 全局导航栏
│   ├── lib/api.ts              # API 客户端 (fetch 封装 + auth helpers)
│   └── middleware.ts            # Next.js 路由保护
├── output/                    # 运行时数据 (gitignore)
├── docs/superpowers/specs/    # 设计文档
│   └── 2026-06-15-brand-brief.md
├── render.yaml                # Render 部署 (Backend only)
└── CLAUDE.md
```

## 关键设计决策

1. **user_id ≠ koc_profile_id**：KOC 注册 (users 表) 和 KOC 档案 (koc_profiles 表) 是两个独立实体。关联方式：email。task slot 里存的是 koc profile id，鉴权和点数发放需通过 email 桥接到 user_id。`task_routes.py` 和 `cron.py` 中的 `_get_koc_user_id()` 做这个桥接。

2. **KOC 意向 = 自动接单**（V2 核心变化）：`POST /api/interests` → KOC 对产品点意向时，系统自动查找该产品已有任务的空 slot 填入；若无空位则自动创建 long_term 任务。**不再等待商家表态或 Admin 手动匹配**。商家对 KOC 点意向仅作为匹配信号，不触发自动操作。

3. **任务广场 (Task Hall)**：KOC 浏览可接任务的核心界面。`GET /api/tasks/hall` 只展示有空位且不重复接单的任务。排序维度：加急优先 (0.30) + 新发布 (0.25) + 佣金 (0.20) + 商家等级 (0.15) + 剩余名额 (0.10)。支持品类/类型/佣金/地区筛选。

4. **加急 vs 长线**：`task_type=urgent` → 发布时自动触发 `match_kocs_for_task()` 填充 slot；`task_type=long_term` → 创建空 slot 进广场，KOC 自主浏览接单，7 天无人接则 cron 介入自动匹配。

5. **质押经济**：
   - 商家每发一个任务：扣平台服务费 **5pt**（不可退）
   - 双方每 slot 质押：各 **10pt**（KOC 接单时扣，商家发货时扣）
   - KOC 提交 → 退还：KOC 得 (10 - 5) = **5pt**，商家 **全额退还**
   - 佣金不走平台点数，走产品上架的 **返佣链接** (commission_link)

    - 合作过加成：同一商家×KOC 历史完成合作 → 匹配分加权（每次+3，上限15；均分≥4.0额外+5）

6. **双向信任分 + 等级联动**：
   - KOC：trust_score 0-100 → L1/L2/L3 (≥55 + 2单 → L2, ≥75 + 5单 + 4.0均分 → L3)
   - 商家：trust_score 0-100 → M1/M2/M3 (≥55 + 3单 → M2, ≥75 + 10单 + 4.0均分 → M3)
   - 信任 <40：商家不可发布新任务；信任 <30：KOC 不参与匹配
   - 完成履约 +3，Ghosted -20，违约 -15，举报成立 -30，主动拒绝 -3
   - 每次信任分变化 → 自动调用 sync_koc_tier/sync_merchant_tier 校准等级（可升可降）

7. **SLA 超时系统**（cron 每小时扫描）：
   | 阶段 | 时限 | 超时动作 |
   |------|------|---------|
   | KOC 接单 | 12h | 自动重推（不扣分） |
   | 商家发货 | 48h | 违约：退 KOC 质押 + 扣商家 20 信任分 |
   | KOC 确认收货 | 7d | 自动确认收货 |
   | KOC 提交内容 | 14d | 违约：退商家质押 + 扣 KOC 15 信任分 |
	   | 商家审核内容 | 4d | 自动通过（退押金+恢复信任，保护 KOC） |
	   | KOC 修改重交 | 3d | 超时按 KOC 违约处理 |
   | 长线空位无人接 | 7d | 系统介入自动匹配 |

8. **AI 评分降级**：DeepSeek API 不可用时自动降级为 mock 分数（基于 handle hash + 粉丝数加成），不阻塞申请流程。

9. **存储模式**：每个 Store 用 `threading.Lock() + JSON 文件`，照搬 tvs-video-tool 的 `FileTaskStore` 模式。无数据库依赖。

10. **Brand**：活力社交方向 — Pink→Purple 渐变、Inter 字体、胶囊按钮、火花符号 ✦、四角色分色背景。

11. **内容审核闭环**（V2.1 新增）：KOC 提交内容后**不再自动完成**，必须经过商家审核：
    - `submit` → slot 进入 `submitted` 状态（待审核），押金/信任暂不释放
    - 商家 `review`（approve）→ slot `approved` → 退押金 + 信任分恢复 + 等级校准
    - 商家 `review`（reject）→ slot `revision_requested` → KOC 修改重交（最多 3 次）
    - 超出修改次数 → KOC 违约（退商家质押 + 扣 KOC 15 信任分）
    - 商家 4 天未审 → cron 自动 approve（防止商家恶意拖延）
    - 发货验证：商家发货需填 `carrier` + `shipping_proof_urls`（凭证照片/截图）
    - 收货验证：KOC 收货可上传 `receipt_photo_urls`（开箱照）+ `receipt_notes`
    - 物流追踪自动化：cron 每日查询所有 shipped slot 的物流状态 → 承运商确认送达 → 自动标记 received。支持 FedEx/DHL/USPS/UPS/SF-Express 等主流承运商，API 查询 + 网页解析双路径兜底，结果缓存避免频繁请求

## API 端点速查

### 认证
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/auth/register` | ✗ | 注册 (koc→100pt, merchant→500pt) |
| POST | `/api/auth/login` | ✗ | 登录 → JWT |
| GET | `/api/auth/me` | ✅ | 用户 + 角色 + 点数 + 信任分 + 等级 |

### 落地页（公开）
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| GET | `/api/landing/stats` | ✗ | 平台统计 (KOC数/视频数/产品数) |
| GET | `/api/landing/products` | ✗ | 活跃产品展示 |

### KOC 申请
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/applications` | ✗ | KOC 申请 → 严格校验 → AI 评分 → 裂变追踪 |
| GET | `/api/applications` | 🔒 | 申请列表 |
| GET | `/api/applications/{id}` | 🔒 | 申请详情 |
| PUT | `/api/applications/{id}/decision` | 🔒 | 审核 approve/reject/watching (通过触发裂变奖励) |

### KOC 档案
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| GET | `/api/koc/pool` | ✅ | 商家匿名浏览 KOC 池 (无联系方式) |
| GET | `/api/koc/pool/{id}` | ✅ | 商家看 KOC 匿名详情 |
| GET | `/api/koc` | 🔒 | Admin 全量列表 (支持筛选) |
| GET | `/api/koc/{id}` | ✅ | KOC 详情 |
| PUT | `/api/koc/{id}` | 🔒 | Admin 更新 KOC |

### 商家
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/merchants` | ✅ | 创建商家 profile |
| GET | `/api/merchants/me` | ✅ | 我的商家档案 |
| PUT | `/api/merchants/me` | ✅ | 更新商家档案 |
| GET | `/api/merchants` | 🔒 | Admin 全量 |
| GET | `/api/merchants/{id}/trust` | ✅ | 商家诚信度 (KOC 决策用) |
| POST | `/api/admin/merchants/{id}/trust` | 🔒 | Admin 调整商家诚信分 |
| POST | `/api/merchants/{id}/report-fake-link` | ✅ | KOC 举报返佣链接无效 |

### 产品
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/products` | ✅ | 商家上架产品 (含返佣链接) |
| GET | `/api/products` | ✅ | 产品列表 (按角色返回不同视图，KOC 视图补商家信息) |
| GET | `/api/products/{id}` | ✅ | 产品详情 |
| PUT | `/api/products/{id}` | ✅ | 更新产品 (owner 或 admin) |

### 意向 → 自动接单（V2 核心）
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/interests` | ✅ | 表达意向：KOC对产品→自动接单，商家对KOC→信号 |
| GET | `/api/interests` | ✅ | 我的意向列表 |
| GET | `/api/interests/matches` | 🔒 | Admin 看所有双向绿灯 |
| PUT | `/api/interests/{id}/match` | 🔒 | Admin 确认匹配 (V1 遗留，V2 基本不需要) |
| PUT | `/api/interests/{id}/decline` | 🔒 | Admin 否决意向 |

### 智能匹配
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/matching/product/{id}` | ✅ | 为产品匹配 Top KOC (规则+AI精排) |
| GET | `/api/matching/koc` | ✅ | 为当前 KOC 匹配 Top 产品 |
| GET | `/api/matching/koc/{id}` | 🔒 | Admin 为指定 KOC 匹配产品 |
| POST | `/api/matching/auto-interest` | ✅ | 批量表达意向 (防重复) |

### 任务 V2（Slot 粒度）
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/tasks` | ✅ | 商家发布任务 (加急自动匹配，扣平台费5pt) |
| GET | `/api/tasks/hall` | ✅ | KOC 任务广场 (筛选+排序+商家诚信度) |
| GET | `/api/tasks/mine` | ✅ | 我的任务 (KOC看slot/商家看发布/admin看全部) |
| GET | `/api/tasks/{id}` | ✅ | 任务详情 (补全产品+商家信息) |
| PUT | `/api/tasks/{id}/accept/{slot}` | ✅ | KOC 接受任务 → 扣质押 10pt |
| PUT | `/api/tasks/{id}/reject/{slot}` | ✅ | KOC 拒绝 → 扣信任分3 + 自动重推 |
| PUT | `/api/tasks/{id}/ship` | ✅ | 商家发货 (物流+承运商+凭证+扣质押) |
| PUT | `/api/tasks/{id}/receive/{slot}` | ✅ | KOC 确认收货 (含开箱照片+备注) |
| PUT | `/api/tasks/{id}/submit/{slot}` | ✅ | KOC 提交内容 → 进入待审核（不自动完成） |
| PUT | `/api/tasks/{id}/review/{slot}` | ✅ | 商家审核 KOC 内容 (approve→完成+确认佣金/reject→驳回) |
| PUT | `/api/tasks/{id}/metrics/{slot}` | ✅ | KOC 更新内容表现数据 (播放/点赞/评论/分享/转化) |
| GET | `/api/tasks/{id}/performance` | ✅ | 商家查看内容表现看板 (汇总+单KOC明细) |
| GET | `/api/tasks/{id}/report` | ✅ | 商家看任务数据报表 |
| POST | `/api/tasks/{id}/force-rematch/{slot}` | 🔒 | Admin 强制重推 slot |
| PUT | `/api/tasks/{id}/sample` | 🔒 | DEPRECATED: 旧版 sample_status 兼容 |

### 点数
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| GET | `/api/credits/balance` | ✅ | 我的点数余额 |
| GET | `/api/credits/history` | ✅ | 点数流水 |
| POST | `/api/credits/reward` | 🔒 | Admin 手动发点 |

### 折扣码
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/coupons` | 🔒 | Admin 生成折扣码 |
| GET | `/api/coupons` | ✅ | 我的折扣码 |
| GET | `/api/coupons/{id}/usage` | ✅ | 折扣码使用统计 |
| POST | `/api/coupons/{id}/orders` | 🔒 | 添加订单 |
| POST | `/api/coupons/batch-import` | 🔒 | CSV 批量导入订单 |

### 裂变
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| GET | `/api/referrals/code` | ✅ | 获取我的推荐码/链接 |
| GET | `/api/referrals` | ✅ | 我的推荐列表 |
| GET | `/api/referrals/stats` | ✅ | 推荐统计 |

### 互评
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/reviews` | ✅ | 履约后互评 (更新 avg_rating) |
| GET | `/api/reviews` | ✅ | 看评价 |

### 黑名单
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/blacklist` | ✅ | 拉黑 |
| GET | `/api/blacklist` | ✅ | 我的黑名单 |
| GET | `/api/blacklist/check` | 🔒 | 检查是否被拉黑 |

### AI 评分
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| POST | `/api/scoring/evaluate-application` | ✗ | 三维评分 (公开) |
| POST | `/api/scoring/evaluate-profile` | 🔒 | 对已有 KOC 重新评分 |

### 管理后台
| Method | Path | Auth | 说明 |
|--------|------|:--:|------|
| GET | `/api/admin/stats` | 🔒 | 仪表盘统计 |
| GET | `/api/admin/users` | 🔒 | 所有用户 (含余额) |
| POST | `/api/admin/cron/scan` | 🔒 | 手动触发周度扫描 |
| GET | `/api/admin/cron/alerts` | 🔒 | 查看逾期告警 |
| GET | `/api/admin/reports` | 🔒 | 举报列表 |
| PUT | `/api/admin/reports/{id}/review` | 🔒 | 审核举报 (approve→扣30+降级) |

✅ = KOC/商家登录即可 &nbsp; 🔒 = admin only

## 点数/质押/费用常量速查

| 常量 | 值 | 说明 |
|------|:--:|------|
| KOC 注册初始 | 1000pt | 注册时发放 |
| 商家注册初始 | 5000pt | 注册时发放 |
| 平台服务费 | 5pt | 商家每发一个任务即扣（不退） |
| KOC 平台费 | 5pt | KOC 每完成一个 slot 从质押中扣 |
| 每 slot 质押 | 10pt | 双方各自质押（KOC接单扣，商家发货扣） |
| 裂变奖励 | 10pt | 推荐人得 |

## 注意事项

- 后端必须从 `backend/` 目录启动 (`uvicorn main:app`)，否则 `from config import ...` 等绝对导入找不到模块
- `backend/.env` 由 config.py 手动加载（不用 python-dotenv），只支持 `KEY=VALUE` 格式
- KOC 的 user_id (users 表) 和 koc_id (koc_profiles 表) 不同，task slot 里存 koc_id，鉴权/点数发放必须做 email 桥接
- 前端 API 调用直连 `http://localhost:8001` (`NEXT_PUBLIC_API_URL` 环境变量)，不走 Next.js 代理
- Tailwind v4 使用 CSS-based `@theme` 配置，不是 `tailwind.config.ts`
- 火花粒子动画使用 CSS custom properties (`--tx` / `--ty`) 做方向控制
- `cron.py` 的 `calculate_tier` / `sync_koc_tier` / `sync_merchant_tier` 是信任分→等级校准的核心函数，任何修改信任分的操作都应调用它们
- KOC 同时进行中任务上限 = **5 个 active slot**（在 accept_task 和 express_interest 两处均有校验）
- 佣金走产品上架时填的 `commission_link`（返佣链接），点数系统不参与佣金发放。`commission_value` 字段仅作展示用
- 匹配引擎 `matcher.py` 分两层：规则引擎 (7维加权) 始终可用 → AI 精排可选 (use_ai=true)。Task 发布时的自动匹配只用规则引擎
- **JSON 存储线程安全**：Store 用 `threading.Lock()` 防竞态，但仅对单进程有效。多 uvicorn worker 部署时，slot 接单等操作存在跨进程竞态风险。生产环境建议单 worker（`--workers 1`）或迁移到数据库
