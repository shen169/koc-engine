<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KOC Engine Frontend

跨境电商 KOC 双边撮合平台前端。Next.js 16 App Router + React 19 + Tailwind CSS 4。

## 技术栈

- **Next.js**: 16.2.9 (App Router, RSC)
- **React**: 19.2.4
- **Tailwind**: v4 (CSS-based `@theme` config, **不是** `tailwind.config.ts`)
- **字体**: Inter + JetBrains Mono (Google Fonts, 在 `layout.tsx` 加载)
- **认证**: localStorage token (`koc_token` + `koc_role`)，通过 middleware 做路由保护（仅匹配路径前缀，实际鉴权在前端做）

## 启动

```bash
cd frontend && npm run dev     # http://localhost:3000
```

## 页面结构

```
app/
├── page.tsx                    # 公开首页 (火花动画 + 三色渐变)
├── koc/apply/page.tsx          # KOC 申请页 (AI评分结算动画)
├── login/page.tsx              # 登录
├── register/page.tsx           # 注册
├── portal/                     # KOC 门户 (暖橙背景)
│   ├── page.tsx                # KOC 首页/仪表盘
│   ├── hall/page.tsx           # 任务广场 (浏览+筛选+排序+接单)
│   ├── products/page.tsx       # 产品池
│   ├── products/[id]/page.tsx  # 产品详情
│   ├── tasks/page.tsx          # 我的任务列表
│   ├── tasks/[id]/page.tsx     # 任务详情 (slot 级操作)
│   ├── credits/page.tsx        # 点数余额+流水
│   ├── coupons/page.tsx        # 折扣码
│   └── referrals/page.tsx      # 裂变推荐
├── dashboard/                  # 商家门户 (浅紫背景)
│   ├── page.tsx                # 商家首页/仪表盘
│   ├── products/page.tsx       # 产品管理
│   ├── products/new/page.tsx   # 上架产品 (含返佣链接字段)
│   ├── koc-pool/page.tsx       # 匿名 KOC 池
│   ├── tasks/page.tsx          # 任务管理
│   ├── tasks/new/page.tsx      # 发布任务 (加急/长线)
│   └── tasks/[id]/page.tsx     # 任务详情+数据报表
└── admin/                      # 管理后台 (中性灰背景)
    ├── page.tsx                # 仪表盘统计
    ├── applications/page.tsx   # 申请记录（只读历史，自动审核通过）
    ├── koc/page.tsx            # KOC 管理
    ├── merchants/page.tsx      # 商家管理
    ├── products/page.tsx       # 产品管理
    ├── interests/page.tsx      # 双向匹配
    ├── tasks/page.tsx          # 任务管理
    └── credits/page.tsx        # 点数管理
```

## 组件清单

| 组件 | 文件 | 说明 |
|------|------|------|
| `Spark` | `components/Spark.tsx` | 火花符号 (呼吸动画 + 弹入 + 匹配粒子，CSS custom properties `--tx`/`--ty`) |
| `MatchModal` | `components/MatchModal.tsx` | 匹配成功弹窗 |
| `CoinDrop` | `components/CoinDrop.tsx` | 点数到账动画 |
| `TaskCard` | `components/TaskCard.tsx` | 任务卡片 (广场/列表复用，显示佣金/质押/商家诚信度/剩余名额) |
| `TaskProgress` | `components/TaskProgress.tsx` | 任务状态进度条 (Slot 级别状态流转) |
| `IntegrityBadge` | `components/IntegrityBadge.tsx` | 诚信度徽章 (M1/M2/M3 + L1/L2/L3) |
| `NavBar` | `components/NavBar.tsx` | 全局导航栏 (按角色显示不同入口) |

## API 客户端 (`lib/api.ts`)

- `api(path, opts)` — 封装 fetch，自动拼接 `NEXT_PUBLIC_API_URL` + 错误处理
- `getToken()` / `setToken()` / `clearToken()` — localStorage token 管理
- `getConsolePath(role)` — 按角色返回门户路径 (`/portal` | `/dashboard` | `/admin`)
- 各模块导出命名空间: `auth` / `applications` / `kocs` / `products` / `interests` / `matching` / `tasks` / `credits` / `admin` / `merchants` / `landing`

### 常用调用模式

```ts
import { api, getToken, tasks } from "@/lib/api";

const token = getToken();
// KOC 浏览任务广场
const hall = await tasks.hall(token!, { sort_by: "urgency", task_type: "urgent" });
// KOC 接单
await tasks.accept(taskId, slotIndex, token!);
// 商家发布任务
await tasks.create({ product_id, task_type: "urgent", koc_required: 2 }, token!);
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001` | 后端 API 地址。生产环境设为 Render URL |

## 关键约定

- **Tailwind v4**：使用 CSS `@theme` 配置 (`app/globals.css`)，不要创建 `tailwind.config.ts`
- **认证**：完全客户端驱动，middleware 不校验 token，只在匹配路径前缀后放行。页面 useEffect 中读取 localStorage token 做鉴权
- **Token 存储 key**：`koc_token` (JWT) + `koc_role` (角色字符串)
- **路由保护**：`middleware.ts` 匹配 `/portal/*` `/dashboard/*` `/admin/*` 前缀，通过 cookie 或 header 不做实际鉴权（仅占位）
- **API 调用**：直连后端（跨域 CORS），不走 Next.js rewrite 代理
- **错误处理**：`api()` 函数对非 2xx 响应抛 Error，detail 来自后端 FastAPI 的 HTTPException
- **角色背景色区分**：
  - 公开页：白底
  - Portal (KOC)：暖橙背景
  - Dashboard (商家)：浅紫背景
  - Admin：中性灰背景
