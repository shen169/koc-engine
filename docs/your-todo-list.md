# 🙋 你需要手动操作的事项

> 最后更新：2026-07-03
> **Phase 1 基础页面补全已完成**（8 个新页面 + Schema 全覆盖）
> 以下是仍需你手动操作的部分，按 Phase 1 三层框架排列

---

## 📊 已完成（代码侧）

| 层级 | 完成项 |
|------|--------|
| **Identity** | Home, About, How it Works ✨, For Brands ✨, For Creators ✨, FAQ ✨, Contact ✨, Privacy ✨, Terms ✨, Research ✨, Blog, Pricing, Case Studies, Guide |
| **Evidence (Schema)** | Organization, WebSite, WebPage ✨, FAQPage, BreadcrumbList ✨, Article ✨, Person ✨, HowTo, Product, Review |
| **Technical SEO** | robots.txt, sitemap.xml (22 URLs), ai.txt, ai/*.json, llms.txt, rss.xml, Vercel headers |

---

## 🚀 快捷链接

| # | 做什么 | 入口 | 参考文档 | 耗时 |
|---|--------|------|----------|:--:|
| 🔴 0 | **Google Search Console 验证** | search.google.com/search-console | DNS TXT 已加阿里云，去点验证 | 1min |
| 🔴 0b | **Bing Webmaster 添加** | bing.com/webmasters | 导入 GSC 数据或手动添加 | 5min |
| 1 | 注册 Trustpilot | https://business.trustpilot.com/ | `docs/third-party-listings-prep.md` | 15min |
| 2 | 注册 Crunchbase | https://www.crunchbase.com/ | 同上 | 5min |
| 3 | 注册统一社交账号 | X, LinkedIn, Facebook, Instagram, YouTube, TikTok, GitHub | 统一名称/头像/简介/链接 | 30min |
| 4 | 填 /about 团队真实信息 | 文件：`frontend/app/about/page.tsx` | 已是真实数据，检查是否需要更新 | 5min |
| 5 | 填 case studies 真实数据 | 文件：`frontend/app/case-studies/page.tsx` | 搜 `[X]` 和 `[Brand` 替换 | 30min+ |
| 6 | 发第一篇 PR（行业角度） | 投递给 Influencer Marketing Hub | 见下方模板 | 30min |
| 7 | 启动创始人品牌 | LinkedIn + X + Medium | 发第一篇行业观点 | 30min |
| 8 | Product Hunt 上线 | https://www.producthunt.com/ | P2-4（下面有说明） | 1-2h |
| 9 | 创建 YouTube 频道 | https://youtube.com/ → Create channel | P2-2（下面有说明） | 15min |

---

## 1. Trustpilot — 15 分钟

**打开：** https://business.trustpilot.com/

1. "Get started" → 公司邮箱注册
2. 搜索 "kocengine.com" → claim 你的域名
3. 填写公司档案——所有文字已准备好，见下方

> 📄 详细步骤和所有文字材料在：`docs/third-party-listings-prep.md` 第 28-66 行

**公司描述（直接复制粘贴到 Trustpilot）：**
```
KOC Engine connects cross-border e-commerce brands with vetted content creators. Brands post product collaboration tasks with built-in escrow protection. Creators browse the task hall, accept deals, and earn commission in platform points (1pt = $1 USD). AI matching finds the right creator in seconds. Dual-pledge system ensures both sides deliver.
```

**Category 选：** E-commerce Service, Marketing Agency

---

## 2. Crunchbase — 5 分钟

**打开：** https://www.crunchbase.com/

1. Sign up → "Add Organization" → "For-profit"
2. 填以下信息：

| 字段 | 内容 |
|------|------|
| Organization name | KOC Engine |
| Website | https://kocengine.com |
| Founded | 2026 |
| Description | AI-powered bilateral matching platform for cross-border e-commerce KOC marketing. Connects Amazon sellers and DTC brands with vetted TikTok creators. |
| Categories | E-Commerce, Marketplace, Influencer Marketing, Creator Economy |

> 📄 详细步骤在：`docs/third-party-listings-prep.md` 第 92-112 行

---

## 3. Google Business Profile — 5 分钟

**打开：** https://business.google.com/

1. "Manage now" → 创建新档案
2. Category 选 "E-commerce service"
3. Google 会邮寄明信片验证地址（填真实收件地址）

> 📄 详细步骤在：`docs/third-party-listings-prep.md` 第 116-129 行

---

## 4. 填 /about 团队信息

**文件位置：**
```
frontend/app/about/page.tsx
```

**打开这个文件，搜索以下占位符并替换成你的真实信息：**

| 搜索 | 替换为 |
|------|--------|
| `[Your Name]` | 你的真实姓名（共 4 处） |
| `[P]` | 你的头像照片 URL |
| `[Add a 2-3 sentence bio...]` | 你的真实背景简介 |
| `[填实际地址或Remote]` | 你的城市或 Remote |

**还有 schema 里的社交链接**（文件同页面前 70 行内的 `founderSchema`）：
- 取消注释 `linkedin.com/in/yourprofile` 和 `twitter.com/yourhandle`
- 替换为你的真实链接

---

## 5. 填 case studies 真实数据

**文件位置：**
```
frontend/app/case-studies/page.tsx
```

这个页面目前是 3 个案例模板，所有数字都是 `[X]` 占位符。你需要从平台的实际数据（`output/` 目录）中提取真实数字。

**每个案例搜索替换：**
- `[Brand Name]` → 真实品牌名
- `[X] creators` → 实际 KOC 数量
- `[X]% delivery rate` / `[X] hours` 等 → 实际数字
- `[Add actual creator or brand quote here]` → 真实引语
- `[Name], [Title], [Brand Name]` → 真实人名和职位

**如果没有 3 个真实案例**——先用 1-2 个，剩下的案例可以暂时删除（在 `caseStudies` 数组中删掉多余的对象）。

---

## 6. 创建 LinkedIn 公司主页

**打开：** https://www.linkedin.com/ → 右下角 "Create a Company Page"

创建后，去这个文件取消注释 LinkedIn 链接：
```
frontend/lib/schema.ts
```
第 15 行左右：把 `// "https://linkedin.com/company/kocengine",` 的 `//` 删掉。

---

## 7. Influencer Marketing Hub 投递

**发邮件给：** editorial@influencermarketinghub.com

**邮件模板（参考）：**
```
Subject: KOC Engine — Cross-border KOC platform for your Best Platforms list

Hi [Editor Name],

I'm building KOC Engine (https://kocengine.com), a bilateral matching platform 
for cross-border e-commerce KOC marketing.

What makes it different:
- Dual-pledge escrow — brands and creators both deposit, no ghosting
- AI matching across 7 dimensions (niche, region, tier, trust, performance)
- Built specifically for cross-border: multi-carrier tracking, platform points (1pt=$1)
- Free to join, per-task pricing, no monthly subscription

We have a detailed KOC marketing guide and comparison pages that might be useful 
for your readers.

Would you consider KOC Engine for your Best Influencer Marketing Platforms list?

Best,
[Your Name]
```

---

## 8. YouTube 频道（P2-2）

**打开：** https://www.youtube.com/ → 右上角头像 → "Create a channel"

**首发 5 个视频建议：**
1. "What is KOC Engine? Platform Walkthrough" (2-3min)
2. "How to Find TikTok Creators for Your Amazon Product" (3-5min)
3. "KOC Engine Pledge System Explained — How Escrow Protects Both Sides" (2-3min)
4. "Brand Dashboard Tutorial — Post a Task in 5 Minutes" (3-5min)
5. "Creator Portal Walkthrough — Browse Deals & Earn Commission" (3-5min)

每个视频标题和描述里自然包含 "KOC marketing"、"cross-border e-commerce"、"creator platform" 等关键词。

---

## 9. Product Hunt 上线（P2-4）

**打开：** https://www.producthunt.com/ → "Launch"

**需要准备的材料：**
- 产品名称：KOC Engine
- Tagline：AI-powered KOC matching platform with dual-pledge escrow for cross-border brands
- 5-8 张截图（PNG，1280×720+）
- 首条 comment（founder story — 你为什么做这个产品）
- 选周二或周三上线（流量最大）

**截图内容：**
1. 首页 Hero
2. Task Hall
3. AI Matching 结果
4. 任务进度条
5. 数据看板
6. /pricing 页面

---

---

## 0. Google Search Console 验证 — 5 分钟 🔴 最优先

**打开：** https://search.google.com/search-console

1. 点击 "添加资源" → 选 "网域"（推荐）或 "网址前缀"
2. 输入 `kocengine.com`
3. **推荐选 DNS TXT 记录验证**（不需要改代码，永不过期）：
   - Google 会给你一条 TXT 记录
   - 去你的域名 DNS 管理（阿里云）添加这条 TXT 记录
   - 等几分钟生效后点验证
4. **或者选 HTML 标签验证**（需要我加代码）：
   - Google 会给一行 `<meta name="google-site-verification" content="..." />`
   - 把这行发给我，我加到 `frontend/app/layout.tsx` 的 `<head>` 里
5. 验证成功后，Google 开始收录数据，1-2 天内可以看到搜索查询、点击量、索引状态

> 验证通过后告诉我，我把验证状态更新到文档。

---

## ⚠️ 优先顺序

| 优先级 | 做哪个 | 为什么 |
|:--:|--------|--------|
| 🔴 | **#0 Google Search Console** | 验证 DNS TXT，开始收集搜索数据 |
| 🔴 | **#0b Bing Webmaster** | 同步 Bing 收录 |
| 🔴 | #1 Trustpilot | ChatGPT 48.7% 引用来自评价平台 |
| 🔴 | #2 Crunchbase | LLM 实体识别的基础数据源 |
| 🔴 | #3 统一社交账号 | Phase 1 强调：名称/头像/简介/链接必须一致 |
| 🟠 | #6 第一篇 PR | 行业角度（Trust Gap, 不是产品广告） |
| 🟠 | #7 创始人品牌 | LinkedIn/X 发布第一篇行业观点 |
| 🟡 | #4 检查 /about | 已填 Jerry 信息，确认需不需要更新 |
| 🟡 | #5 填 case studies | 需要平台有足够运行数据 |
| 🟡 | #8 Product Hunt | 等前面完善后再上线 |
| 🟡 | #9 YouTube 频道 | 需要录制视频素材 |

---

## 新增：创始人品牌建设（Level 2 — Evidence）

**目标**：让 AI 把 "Jojo Shen" 和 "KOC Engine" 关联起来。

### 第一步：完善 LinkedIn
- 个人简介写清楚：Founder of KOC Engine | Building trust infrastructure for creator economy
- Featured section 放 kocengine.com
- 发第一篇 Post（见下方模板）

### 第二步：X (Twitter)
- 简介同上
- Pin 一条介绍 KOC Engine 的推文

### 第一篇内容模板（LinkedIn / X 通用）：
```
I got tired of creators ghosting after receiving free products.

30-40% ghosting rate is "normal" in this industry. 
Brands lose product + shipping + weeks of waiting.

So I built a system where both sides have skin in the game:
→ Brand pre-pays commission into escrow
→ Creator deposits a small pledge
→ Both deliver, or both lose

Ghosting rate on KOC Engine: <1%.

The creator economy doesn't need better discovery.
It needs better trust infrastructure.
```

---

## 新增：Research Center 已建

`/research` 页面已建好（占位），6 个研究主题已定义。等平台运行数据积累后，可以开始填充。

---

---

## 10. Digital PR — 联系行业媒体（P2-3）

### 目标媒体清单

**跨境电商 / Amazon 卖家媒体（最优先）：**

| 媒体 | 为什么重要 | 投递方式 |
|------|-----------|----------|
| Jungle Scout blog | Amazon 卖家第一工具，读者精准 | 找 editorial 邮箱或投稿入口 |
| SellerApp blog | Amazon 数据分析博客 | 同上 |
| Helium 10 blog | Amazon 卖家第二大工具 | 同上 |
| EcomCrew | 电商播客+博客，Mike 是 KOL | mike@ecomcrew.com 或投稿 |
| Practical Ecommerce | 电商实战媒体 | 投稿入口 |
| Marketplace Pulse | 电商平台数据研究 | 提供数据/引用 |

**Influencer Marketing 媒体：**

| 媒体 | 为什么重要 | 投递方式 |
|------|-----------|----------|
| Influencer Marketing Hub | 行业 #1 媒体 | editorial@influencermarketinghub.com |
| Social Media Today | 社媒营销 | 投稿或 contact form |
| Digiday | 数字营销行业 | tips@digiday.com |
| Creator Economy by The Information | 创作者经济权威 | 投稿 |

### 投递角度（3 个钩子，选一个）

**钩子 1：独特数据**
```
Subject: Exclusive data: [X]% ghosting rate in cross-border KOC campaigns

Hi [Editor],

I run KOC Engine, a cross-border KOC matching platform. We've analyzed 
data from [X] campaigns and found:

- [X]% of manually-sourced creators ghost after receiving free products
- Pledge-protected campaigns reduce ghosting to <5%
- Cross-border brands save [X] hours per campaign using AI matching

Would this data be useful for an article on influencer marketing fraud 
or cross-border e-commerce trends? Happy to provide a full data breakdown.

Best,
[Your Name]
```

**钩子 2：行业趋势评论**
```
Subject: Comment: Why cross-border KOC marketing needs escrow, not just CRM

Hi [Editor],

I saw your recent piece on [article topic]. One angle I think is 
under-discussed: the trust gap in cross-border influencer marketing.

US-based CRM tools (GRIN, Upfluence) assume you already have creator 
relationships. Cross-border sellers don't — they need a marketplace 
with built-in trust mechanisms.

I've written about this at kocengine.com/blog — happy to contribute 
a byline or provide expert commentary for your next piece on 
influencer marketing platforms.

Best,
[Your Name]
```

**钩子 3：工具对比/推荐**
```
Subject: KOC Engine for your next "Best Influencer Platforms" roundup

Hi [Editor],

I noticed your [article title] doesn't include any platforms built 
specifically for cross-border e-commerce.

KOC Engine (https://kocengine.com) fills that gap:
- Dual-pledge escrow (brands + creators both deposit)
- AI matching across 7 dimensions including regional market match
- Multi-carrier tracking (FedEx/DHL/USPS/SF-Express)
- Transparent per-task pricing (no monthly subscription)

Full comparison vs GRIN/Upfluence: https://kocengine.com/blog

Would you consider including us in your next update?

Best,
[Your Name]
```

### 操作节奏

| 周 | 动作 | 目标 |
|----|------|------|
| Week 1 | 发 10 封 pitch 邮件 | 2-3 回复 |
| Week 2-3 | 跟进未回复的 | 1-2 个 placement 确认 |
| Week 4-8 | 写 guest post / 提供数据 | 1 篇 guest post 上线 |
| Month 2-6 | 持续每月 5 封新 pitch | 6 个月 8-20 placements |

---

## 11. 研究报告提纲（P2-5）

**标题：** State of KOC Marketing for Cross-Border E-Commerce (2026)

### 你能从自己平台提取的数据（不涉及用户隐私）

从 `output/` 目录的 JSON 数据中提取匿名化的：

| 数据点 | 来源 |
|--------|------|
| 平均每任务 KOC 接单数 | `output/tasks/` |
| 各品类平均佣金 | `output/tasks/` 的 commission 字段 |
| KOC Tier 分布（L1/L2/L3 占比） | `output/koc_profiles/` |
| 平均内容提交天数 | `output/tasks/` 的 created_at 和 submitted_at 时间差 |
| Ghosting 率（接了单但没提交的占比） | `output/tasks/` 中状态为 timeout 的 slot |
| Merchant Tier 分布（M1/M2/M3 占比） | `output/merchants/` |
| 各区域 KOC 分布 | `output/koc_profiles/` 的 region 字段 |

### 报告结构

```
1. Executive Summary
2. Market Overview — global KOC/influencer market size, cross-border trends
3. Creator Economics — avg commission by category, tier distribution, earnings
4. Brand ROI — avg content pieces per campaign, engagement rates, ghosting stats
5. Trust & Safety — pledge completion rates, dispute resolution data
6. Regional Breakdown — US vs UK vs EU vs SEA vs JP
7. Platform Comparison — KOC Engine vs manual vs agency (cost/time/ROI)
8. 2026-2027 Predictions
```

### 发布后怎么做

1. 发到 `/report/state-of-koc-marketing-2026` 页面
2. 给上面 Digital PR 清单里的每个媒体发 pitch（数据报告是最好的 PR 钩子）
3. 在 Reddit r/AmazonSeller、r/ecommerce 分享关键发现
4. 数据驱动内容获得 **3× 更多 backlinks**（BuzzSumo 研究）
