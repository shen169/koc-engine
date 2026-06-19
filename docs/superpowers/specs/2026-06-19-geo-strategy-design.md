# KOC Engine — SEO + GEO + Reddit 冷启动策略

> 设计日期：2026-06-19
> 状态：草稿
> 目标：让 KOC Engine 在搜索引擎、AI 搜索和 Reddit 上可见，驱动商家和 KOC 注册

## 1. 背景

KOC Engine 产品核心功能已完备（任务匹配、质押经济、信任体系、内容审核、表现追踪、物流自动化），但对外完全不可见：

- 前端未部署上线
- 零 SEO（无 sitemap/robots/OG/结构化数据）
- 无 AI 搜索优化（GEO）
- 无 Reddit 品牌存在
- 首页内容薄弱，统计数据全为 0

冷启动顺序：**流量 → 商家入驻 → KOC 自然来**。商家是供给端，没有任务 KOC 无事可做。

目标市场：亚马逊跨境卖家 + 独立站 DTC 品牌（两者都做）。

## 2. 搜索意图研究

基于真实搜索数据，以下是商家和 KOC 两端的高频搜索意图。

### 2.1 商家端 — 搜索意图 × 产品卖点

| 真实搜索意图 | 搜索强度 | KOC Engine 对应卖点 |
|-------------|:--------:|-------------------|
| "find tiktok creators for amazon product" | 高 | AI 匹配引擎 + 7 维打分（品类/等级/地区/信任/表现） |
| "how to verify influencer quality before sending samples" | 高 | AI 三维评分 + 信任分 L1/L2/L3 + 历史表现数据 |
| "influencer got free product but no content posted" | 高 | 双向质押经济：KOC 有押金在平台，不履约不退 |
| "cross border sample shipping logistics for influencers" | 中 | 多承运商物流追踪 + 送达自动收货 |
| "influencer marketing ROI tracking amazon" | 高 | 商家 Dashboard — 播放/点赞/评论/转化/收入实时看板 |
| "KOC vs KOL marketing cost comparison" | 中 | 透明费用：平台费 5pt + 质押 10pt（退），佣金商家自定 |
| "amazon influencer program alternative" | 高 | KOC Engine 定位为 Amazon Influencer Program 的替代/补充 |
| "how much does influencer marketing cost for new amazon product" | 中 | 低成本入门：质押制而非预付佣金 |
| "ugc creator platform for shopify brands" | 中 | 支持独立站 DTC 品牌 + 返佣链接 |
| "how to prevent fake influencers scamming brands" | 中 | AI 评分 + 信任分 + 申请审核 + 黑名单 |

### 2.2 KOC 端 — 搜索意图 × 产品卖点

| 真实搜索意图 | 搜索强度 | KOC Engine 对应卖点 |
|-------------|:--------:|-------------------|
| "brand deals for small creators under 10k followers" | 高 | 任务广场对所有已审核 KOC 开放 |
| "free products for review plus commission" | 高 | 免费样品 + 返佣链接赚佣金 |
| "how to avoid brand scams as content creator" | 中 | 商家诚信度 M1/M2/M3 + 举报机制 + 黑名单 |
| "long term brand partnership for tiktok creators" | 中 | 合作过加成 — 匹配引擎自动优先合作过的商家 |
| "how much to charge for UGC tiktok video" | 中 | 透明佣金结构 + 市场定价参考 |
| "brand collaboration platform that protects creators" | 中 | 质押托管：商家不发货退押金给 KOC |
| "ugc creator marketplace with verified brands" | 中 | 商家信任分 + 公开评价 |

## 3. SEO 技术基建

当前缺失，需从零建立。

### 3.1 必须项

| 项目 | 文件 | 说明 |
|------|------|------|
| robots.txt | `frontend/public/robots.txt` | 允许所有爬虫，指向 sitemap |
| sitemap.xml | Next.js `generateSitemaps()` | 动态生成，覆盖首页/注册/落地页 |
| OG 标签 | `layout.tsx` metadata | `og:title/image/url/type/site_name`，中英双语 |
| Twitter Card | `layout.tsx` metadata | `twitter:card/image/title` |
| JSON-LD 结构化数据 | 首页组件 | `Organization` + `WebApplication` + `FAQ` schema |
| hreflang | `layout.tsx` | 中英文页面互相指向 `zh-CN` ↔ `en-US` |
| canonical URL | `layout.tsx` | 防止重复内容 |
| favicon | `public/favicon.ico` | 火花 ✦ 符号图标（当前引用但文件不存在） |
| meta description | `layout.tsx` | 重写，含关键词：KOC marketing platform, Amazon influencer alternative, cross-border creator matching |

### 3.2 性能

- Lighthouse 跑分 ≥ 90（SEO 排名因子）
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1

## 4. GEO — AI 搜索引擎优化

AI 搜索（ChatGPT、Perplexity、Google AI Overview）的回答来源主要是 Reddit、高质量长文、FAQ 结构化数据。

### 4.1 FAQ Schema（嵌入首页）

以下 FAQ 基于真实搜索意图，用 JSON-LD `FAQPage` schema 标记。AI 会直接抓取作为答案：

```json
[
  {
    "question": "How to find KOC creators for Amazon product launches?",
    "answer": "KOC Engine uses AI to match your products with vetted creators based on niche category, region, follower count, trust score, and past content performance. Creators are pre-screened with a 3-dimension AI evaluation."
  },
  {
    "question": "How to prevent creators from not delivering after receiving free samples?",
    "answer": "KOC Engine uses a dual-pledge deposit system. Both merchant and KOC deposit platform credits before collaboration begins. KOC deposit is only returned after the merchant approves the submitted content. This ensures accountability on both sides."
  },
  {
    "question": "What does KOC marketing cost for cross-border ecommerce brands?",
    "answer": "Platform service fee is 5 credits per task. Both sides pledge 10 credits per creator slot (fully refundable upon successful completion). Commission rates are set by the merchant. No hidden fees."
  },
  {
    "question": "How to track influencer content performance and ROI?",
    "answer": "KOC Engine provides a real-time performance dashboard showing views, likes, comments, shares, click-throughs, conversions, and attributed revenue per creator. Engagement rates are auto-calculated and KOCs are ranked by performance."
  },
  {
    "question": "How does KOC differ from KOL marketing?",
    "answer": "KOC (Key Opinion Consumer) focuses on authentic product reviews by everyday users with smaller but more engaged audiences. KOL (Key Opinion Leader) uses celebrity-level influencers. KOC typically costs 80-90% less and drives higher conversion rates for product discovery."
  }
]
```

### 4.2 Pillar 长文

标题：**"The Complete Guide to KOC Marketing for Cross-Border E-Commerce (2026)"**

- 中英文双语版本
- 结构：What → Why → How（find/vet/ship/pay/track）
- 嵌入真实数据（市场规模、成本对比）
- 内链到 KOC Engine 各功能页
- 被 AI 引用为权威来源

### 4.3 品牌结构数据

```json
{
  "@type": "Organization",
  "name": "KOC Engine",
  "description": "AI-powered KOC matching platform for cross-border e-commerce. Connect Amazon sellers and DTC brands with vetted TikTok creators.",
  "url": "https://kocengine.com",
  "sameAs": ["https://reddit.com/r/kocengine", "https://twitter.com/kocengine"]
}
```

## 5. Reddit 策略

Reddit 是 AI 搜索时代最重要的渠道 — 它同时是流量来源、外链来源、AI 训练数据来源。

### 5.1 目标子版块

| 子版块 | 成员规模 | 目标角色 | 切入方式 |
|--------|:--------:|:--------:|---------|
| r/AmazonSeller | 大 | 商家 | 回答 KOC 相关问题，分享实战经验 |
| r/FulfillmentByAmazon | 大 | 商家 | Amazon FBA 卖家聚集地 |
| r/ecommerce | 大 | 商家 | 独立站/DTC 品牌 |
| r/influencermarketing | 中 | KOC+商家 | 平台推荐讨论 |
| r/TikTokShop | 中 | KOC+商家 | TikTok 带货生态 |
| r/shopify | 大 | 商家 | Shopify 卖家 |
| r/UGCcreators | 小 | KOC | UGC 创作者社区 |

### 5.2 执行节奏

| 阶段 | 时间 | 行动 | 目标 |
|------|------|------|------|
| 暖场 | 第 1 周 | 建账号，在各子版块自然回帖 5-10 条/天。不提产品，纯价值回复 | 积累 karma，了解社区文化 |
| 痛点帖 | 第 2 周 | 发讨论帖：*"How do you guys handle KOC outreach for new Amazon product launches? Getting burned by creators taking samples then ghosting."* | 引发讨论，自然引出质押方案 |
| 案例帖 | 第 3 周 | 深度帖子：*"I tested 4 influencer platforms for Amazon products — here's what actually worked"* | 被 AI 抓取为权威内容 |
| 持续 | 第 4 周起 | 每周 3-5 条回复 + 1 条新帖。监控提及品牌的帖子 | 维持 Reddit 品牌信号 |

### 5.3 价值循环

```
Reddit 帖子
  → Google 排名（Reddit 域名权威度 91）→ 自然搜索流量
  → AI 训练数据 → ChatGPT/Perplexity 推荐 KOC Engine → 品牌认知
  → 社区直接讨论 → 商家/KOC 点击注册
  → 反向链接 → 提升 kocengine.com 域名权威
```

## 6. 内容日历

| 周 | 内容 | 渠道 | 目标关键词 |
|:--:|------|------|-----------|
| 1 | 首页重写（双角色导向），SEO 基建上线 | 官网 | brand discovery: "KOC platform for amazon sellers" |
| 2 | Pillar 长文 "Complete Guide to KOC Marketing" | 官网博客 | informational: all KOC-related long-tail queries |
| 3 | Reddit 案例帖 "I tested 4 influencer platforms for Amazon" | r/AmazonSeller | comparison: "best influencer platform for amazon" |
| 4 | FAQ schema + 结构化数据上线 | 官网 | AI search: ChatGPT/Perplexity 引用 |
| 5 | "How KOC Engine Prevents Creator Non-Delivery" | 官网 + Reddit | trust: "prevent influencer scam" "escrow creator platform" |
| 6 | "Sample Shipping Logistics for Cross-Border Creators" | 官网 + r/ecommerce | logistics: "ship samples to tiktok creators" |

## 7. 冷启动漏斗

```
AI 搜索 (ChatGPT/Perplexity) ←── FAQ Schema + Pillar 文章 + Reddit 信号
        │
        ▼
    自然搜索 (Google) ←── SEO 基建 + Reddit 外链
        │
        ▼
    官网落地页 ←── 双角色导向 CTA + Social Proof + FAQ
        │
        ├── 商家注册 → Dashboard → 上产品 → 发任务
        │
        └── KOC 注册 → 申请 → AI 评分 → 任务广场接单
```

## 8. 成功指标

| 指标 | 3 个月目标 | 6 个月目标 |
|------|:---------:|:---------:|
| Google 收录页面数 | 10+ | 50+ |
| ChatGPT/Perplexity 中出现品牌名 | ≥ 3 次/月 | ≥ 10 次/月 |
| Reddit 帖子自然流量 | 500+/月 | 2000+/月 |
| 自然搜索注册 | 20 商家 | 100 商家 + 50 KOC |
| 域名权威 (DA) | 5+ | 15+ |
