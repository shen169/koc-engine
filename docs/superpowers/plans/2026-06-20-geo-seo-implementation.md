# SEO + GEO 冷启动 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让 KOC Engine 首页和公开页面具备完整的 SEO/GEO 能力（robots/sitemap/OG/结构化数据/FAQ Schema/hreflang）+ 重写首页为双角色导向 + 部署到 Vercel

**架构：** 纯前端改动（Next.js App Router），不涉及后端 API 变更。利用 Next.js 的 `Metadata` API、`generateSitemaps()`、`Script` 组件和 `public/` 静态文件。首页从单页 "use client" 改为混合模式（静态内容 SSR + 动态 stats 客户端获取）。

**技术栈：** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript

---

## 文件结构

```
frontend/
├── public/
│   ├── robots.txt          [NEW] 爬虫规则
│   ├── favicon.ico          [NEW] 火花图标
│   └── images/
│       └── og-image.png     [NEW] 社交分享预览图
├── app/
│   ├── layout.tsx           [MODIFY] metadata 全面增强
│   ├── sitemap.ts           [NEW] 动态 sitemap 生成
│   ├── page.tsx             [REWRITE] 首页双角色 + FAQ Schema
│   ├── globals.css          [MODIFY] 添加入场动画
│   └── guide/
│       └── page.tsx         [NEW] Pillar 长文页面 (SSR)
├── components/
│   └── JsonLd.tsx           [NEW] JSON-LD 结构化数据组件
├── vercel.json              [NEW] Vercel 部署配置
└── next.config.ts           [MODIFY] 添加 headers/redirects
```

---

### 任务 1：SEO 基建 — robots.txt + favicon

**文件：**
- 创建：`frontend/public/robots.txt`
- 创建：`frontend/public/favicon.svg`（矢量，兼容性好）
- 创建：`frontend/public/images/og-image.png`（先用 SVG 占位）

- [ ] **步骤 1：创建 robots.txt**

```txt
User-agent: *
Allow: /
Disallow: /portal/
Disallow: /dashboard/
Disallow: /admin/

Sitemap: https://kocengine.com/sitemap.xml
```

> 注：`/portal/` `/dashboard/` `/admin/` 均为登录后的控制台页面，无需被搜索引擎索引。

- [ ] **步骤 2：创建 favicon.svg（火花 ✦ 符号）**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#EC4899"/>
      <stop offset="100%" style="stop-color:#A855F7"/>
    </linearGradient>
  </defs>
  <text x="32" y="48" text-anchor="middle" font-size="56" font-family="serif" fill="url(#g)">✦</text>
</svg>
```

- [ ] **步骤 3：更新 layout.tsx 的 icon 引用**

在 `frontend/app/layout.tsx` 中：
```tsx
icons: {
  icon: "/favicon.svg",
},
```

- [ ] **步骤 4：创建 OG 占位图**

创建一个简单的 1200×630 SVG 转为 PNG 放在 `public/images/og-image.png`。先用纯色渐变 + 文字 SVG 替代（后续可替换为专业设计图）：

```svg
<!-- public/images/og-image.svg — 先用此替代，后续替换为 PNG -->
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF7ED"/>
      <stop offset="50%" style="stop-color:#FDF2F8"/>
      <stop offset="100%" style="stop-color:#F5F3FF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="280" text-anchor="middle" font-size="80" font-family="sans-serif" font-weight="bold" fill="#1F2937">KOC Engine</text>
  <text x="600" y="360" text-anchor="middle" font-size="36" font-family="sans-serif" fill="#6B7280">AI-Powered KOC Matching for Cross-Border E-Commerce</text>
</svg>
```

- [ ] **步骤 5：Commit**

```bash
git add frontend/public/robots.txt frontend/public/favicon.svg frontend/public/images/
git commit -m "feat: add robots.txt, favicon, and OG image placeholders"
```

---

### 任务 2：SEO 基建 — sitemap.xml 动态生成

**文件：**
- 创建：`frontend/app/sitemap.ts`

- [ ] **步骤 1：创建 sitemap.ts（Next.js 内置 sitemap 生成）**

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/koc/apply`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guide/koc-marketing-cross-border-ecommerce`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
```

- [ ] **步骤 2：验证**

启动 `npm run dev`，访问 `http://localhost:3000/sitemap.xml` 确认生成正确的 XML。

- [ ] **步骤 3：Commit**

```bash
git add frontend/app/sitemap.ts
git commit -m "feat: add dynamic sitemap.xml generation"
```

---

### 任务 3：SEO 基建 — layout.tsx metadata 全面增强

**文件：**
- 修改：`frontend/app/layout.tsx`

- [ ] **步骤 1：重写 metadata 导出**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";
const SITE_NAME = "KOC Engine";
const SITE_DESCRIPTION =
  "AI-powered KOC matching platform for cross-border e-commerce. Connect Amazon sellers and DTC brands with vetted TikTok creators. Free product samples + commission. Dual-pledge escrow protection.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF2F8" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2937" },
  ],
};

export const metadata: Metadata = {
  // ── 基础 ──
  title: {
    default: `${SITE_NAME} — AI KOC Matching for Cross-Border E-Commerce`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "zh-CN": "/zh",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Open Graph ──
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI KOC Matching Platform`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/images/og-image.svg",
        width: 1200,
        height: 630,
        alt: "KOC Engine — AI-Powered Creator Matching",
      },
    ],
    locale: "en_US",
  },

  // ── Twitter Card ──
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI KOC Matching Platform`,
    description: SITE_DESCRIPTION,
    images: ["/images/og-image.svg"],
    creator: "@kocengine",
  },

  // ── 图标 ──
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },

  // ── 其他 ──
  keywords: [
    "KOC platform", "influencer marketing", "Amazon influencer alternative",
    "TikTok creator matching", "UGC creator marketplace", "cross-border ecommerce",
    "KOC marketing", "creator collaboration platform", "brand deal platform",
    "Amazon seller marketing", "DTC brand influencer", "Shopify influencer app",
  ],
  authors: [{ name: "KOC Engine" }],
  creator: "KOC Engine",
  publisher: "KOC Engine",
};
```

- [ ] **步骤 2：保留现有的字体加载和 `<body>` 结构不变**

`RootLayout` 函数体保持不变（字体 preconnect + children 渲染）。

- [ ] **步骤 3：验证编译**

```bash
cd frontend && npm run build
```

确认无 TypeScript 错误。

- [ ] **步骤 4：Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat: full SEO metadata — OG, Twitter Card, hreflang, robots, keywords"
```

---

### 任务 4：JSON-LD 结构化数据组件

**文件：**
- 创建：`frontend/components/JsonLd.tsx`

- [ ] **步骤 1：创建通用 JSON-LD 组件**

```tsx
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **步骤 2：创建 Organization Schema 数据工厂**

```ts
// frontend/lib/schema.ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kocengine.com";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KOC Engine",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description:
      "AI-powered KOC matching platform for cross-border e-commerce. Connect Amazon sellers and DTC brands with vetted TikTok creators.",
    foundingDate: "2026",
    sameAs: [
      "https://twitter.com/kocengine",
      "https://reddit.com/user/kocengine",
    ],
  };
}

export function webApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "KOC Engine",
    url: SITE_URL,
    description:
      "AI-powered platform connecting cross-border e-commerce brands with vetted KOC creators for authentic product reviews and content.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/components/JsonLd.tsx frontend/lib/schema.ts
git commit -m "feat: JSON-LD structured data component + schema factories"
```

---

### 任务 5：首页重写 — 双角色导向 + 完整 SEO

**文件：**
- 重写：`frontend/app/page.tsx`

这是最大的改动。首页从 KOC-only 单页改为双角色导向，嵌入所有结构化数据。

- [ ] **步骤 1：重写为 SSR-compatible 混合页面**

```tsx
import Link from "next/link";
import Spark from "@/components/Spark";
import JsonLd from "@/components/JsonLd";
import { organizationSchema, webApplicationSchema, faqSchema } from "@/lib/schema";
import { HomeStats } from "./HomeStats";

// ── FAQ 数据（来自设计规格 §4.1）──
const homeFaqs = [
  // 商家视角
  {
    question: "How to find TikTok creators that match my specific product niche?",
    answer:
      "KOC Engine's AI matching engine scores creators across 7 dimensions: niche category overlap, tier bonus, content quality score, regional market match, collaboration history, trust score, and content performance. Top matches are automatically ranked. Browse the KOC pool with filters by platform, niche tags, follower count, region, and trust tier.",
  },
  {
    question: "How many vetted creators are available for cross-border ecommerce brands?",
    answer:
      "All creators go through a 3-stage process: application → AI scoring (authenticity, niche fit, engagement) → admin review. Approved creators receive trust tiers (L1/L2/L3). The KOC pool is visible with full filtering while contact info stays anonymized until a task is matched.",
  },
  {
    question: "What targeting options exist for matching with KOC creators?",
    answer:
      "KOC Engine supports 7 targeting dimensions: product category matching, creator tier (L1-L3), trust score, region (US/UK/CA/AU/EU/JP/KR/SEA/CN), follower count range, content performance score, and past collaboration history. Urgent tasks auto-match immediately; long-term tasks stay in the task hall for organic browsing.",
  },
  // KOC 视角
  {
    question: "How can small creators find brand deals and get free products to review?",
    answer:
      "KOC Engine has a task hall where creators browse all open collaboration opportunities — product details, commission amounts, merchant trust tier, required content type. Filter by category, commission minimum, task type, and region. No minimum follower count to get started.",
  },
  {
    question: "How much can creators earn from KOC brand collaborations?",
    answer:
      "Creators earn through commission links set by brands — typically 15-30% discount codes or flat commission per sale. Platform pledges are fully refundable upon successful content approval. Top performers (L3 tier) get priority matching and appear at the top of merchant search results.",
  },
  // 信任
  {
    question: "How to prevent creators from taking free samples without posting content?",
    answer:
      "KOC Engine uses a dual-pledge deposit system. Both sides deposit platform credits before collaboration. KOC's deposit is only refunded after the merchant approves their content. If KOC fails to submit within 14 days, deposit is forfeited and trust score drops 15 points.",
  },
  {
    question: "What is the best platform for cross-border KOC influencer marketing?",
    answer:
      "The best KOC platform depends on needs: AI matching quality (niche + region accuracy), trust systems (pledge/deposit protection), content performance tracking, and transparent pricing. Look for escrow-based payment, creator vetting (AI + human review), and performance analytics.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── 结构化数据 ── */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webApplicationSchema()} />
      <JsonLd data={faqSchema(homeFaqs)} />

      {/* ── Hero ── */}
      <section
        className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6"
        style={{
          background: "linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 50%, #F5F3FF 100%)",
        }}
      >
        <Spark size={64} animate className="mb-8" />
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 max-w-3xl brand-gradient-text">
          AI-Powered KOC Matching for Cross-Border Brands
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Find vetted TikTok creators for your Amazon or DTC products. Dual-pledge escrow
          ensures both sides deliver. Track performance in real time.
        </p>

        {/* 双角色 CTA */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Link
            href="/register?role=merchant"
            className="btn-brand px-8 py-4 text-lg font-bold rounded-full shadow-lg shadow-pink-200"
          >
            🏢 Find Creators for My Brand
          </Link>
          <Link
            href="/register?role=koc"
            className="rounded-full px-8 py-4 text-lg font-bold bg-white text-zinc-900 border-2 border-zinc-200 hover:border-pink-300 transition shadow-sm"
          >
            🎬 Become a Creator Partner
          </Link>
        </div>
        <p className="text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-pink-500 font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        {/* Dynamic Stats */}
        <HomeStats />
      </section>

      {/* ── Value Props（双视角）── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-zinc-900 mb-4">
            Why Brands &amp; Creators Choose KOC Engine
          </h2>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Built for cross-border e-commerce. AI matching, escrow protection, and
            real-time performance tracking — all in one platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* 商家列 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-3">
              🏢 For Brands &amp; Sellers
            </h3>
            {[
              {
                icon: "🤖",
                title: "AI Smart Matching",
                desc: "7-dimension scoring — niche, region, tier, trust, performance. Find the right creator in seconds, not weeks.",
              },
              {
                icon: "🛡️",
                title: "Pledge Protection",
                desc: "Creators deposit before receiving samples. No more ghosting after free products. Only pay for approved content.",
              },
              {
                icon: "📊",
                title: "Performance Analytics",
                desc: "Real-time dashboard — views, engagement, conversions, revenue per creator. Know your ROI on every collaboration.",
              },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h4 className="font-bold text-zinc-900 mb-1">{v.title}</h4>
                <p className="text-sm text-zinc-500">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* KOC 列 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-pink-600 uppercase tracking-wide mb-3">
              🎬 For Creators
            </h3>
            {[
              {
                icon: "🏪",
                title: "Task Hall",
                desc: "Browse all open brand deals. Filter by category, commission, and region. Accept up to 5 concurrent tasks.",
              },
              {
                icon: "💰",
                title: "Earn Commission + Free Products",
                desc: "Keep the products you review. Earn through brand commission links. Top performers unlock L3 priority matching.",
              },
              {
                icon: "⭐",
                title: "Build Your Reputation",
                desc: "Trust tiers (L1→L2→L3) based on completed collaborations and ratings. Higher tiers = more brand deals + better matching priority.",
              },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-pink-100 shadow-sm">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h4 className="font-bold text-zinc-900 mb-1">{v.title}</h4>
                <p className="text-sm text-zinc-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-orange-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-zinc-900 mb-14">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Brand Posts Task", desc: "Set product, commission, KOC count. Urgent tasks auto-match." },
              { step: "2", title: "AI Matches Creators", desc: "7-dimension scoring finds best-fit KOCs by niche and region." },
              { step: "3", title: "Both Pledge + Ship", desc: "Dual deposit locks in. Brand ships sample, KOC creates content." },
              { step: "4", title: "Review + Track ROI", desc: "Brand approves content. Track views, engagement, conversions." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 brand-gradient">
                  <span className="text-white text-xl font-extrabold">{item.step}</span>
                </div>
                <h4 className="font-bold text-zinc-900 mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-4">
            Built for Trust in Cross-Border Commerce
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8 text-left">
            {[
              { icon: "🔒", title: "Dual-Pledge Escrow", desc: "Both brand and creator deposit before starting. Neither side can walk away without consequence." },
              { icon: "🤖", title: "AI Vetting", desc: "Every creator passes 3-dimension AI scoring: authenticity, niche fit, engagement. Manual admin review for final approval." },
              { icon: "⭐", title: "Public Trust Tiers", desc: "Merchants (M1-M3) and KOCs (L1-L3) display trust scores based on completed collaborations and peer ratings." },
            ].map((v) => (
              <div key={v.title}>
                <div className="text-3xl mb-3">{v.icon}</div>
                <h4 className="font-bold text-zinc-900 mb-1">{v.title}</h4>
                <p className="text-sm text-zinc-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section（视觉展示 + Schema 标记）── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center text-zinc-900 mb-14">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {homeFaqs.map((faq) => (
            <details key={faq.question} className="bg-white rounded-2xl border border-gray-100 p-5 group cursor-pointer">
              <summary className="font-semibold text-zinc-800 text-sm list-none flex items-center justify-between">
                {faq.question}
                <span className="text-zinc-300 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 text-zinc-400 text-center py-8 text-sm">
        <div className="flex justify-center gap-4 mb-3">
          <Link href="/login" className="hover:text-purple-400 underline">Sign In</Link>
          <Link href="/register" className="hover:text-purple-400 underline">Create Account</Link>
          <Link href="/guide/koc-marketing-cross-border-ecommerce" className="hover:text-purple-400 underline">KOC Marketing Guide</Link>
        </div>
        <p className="text-zinc-500">KOC Engine — Connecting Cross-Border Brands &amp; Creators</p>
      </footer>
    </>
  );
}
```

- [ ] **步骤 2：创建 HomeStats 客户端组件（动态统计数字）**

```tsx
// frontend/app/HomeStats.tsx
"use client";

import { useEffect, useState } from "react";
import { landing } from "@/lib/api";

export function HomeStats() {
  const [stats, setStats] = useState({ total_kocs: 0, total_videos: 0, active_products: 0 });

  useEffect(() => {
    landing.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex gap-10 mt-16 text-center">
      {[
        [stats.total_kocs, "Vetted Creators"],
        [stats.total_videos, "Videos Delivered"],
        [stats.active_products, "Active Campaigns"],
      ].map(([val, label]) => (
        <div key={label as string}>
          <div className="text-4xl font-extrabold brand-gradient-stat">
            {(val as number) > 0 ? `${val}+` : "—"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">{label as string}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **步骤 3：验证编译 + 首页渲染**

```bash
cd frontend && npm run build
```

确认无错误，访问 `http://localhost:3000` 检查：
- Hero 双按钮区分（商家 / KOC）
- Value Props 左右分列
- FAQ 折叠面板正常
- Stats 组件加载

- [ ] **步骤 4：Commit**

```bash
git add frontend/app/page.tsx frontend/app/HomeStats.tsx
git commit -m "feat: rewrite homepage — dual-role CTA, FAQ schema, trust signals, full SEO"
```

---

### 任务 6：Pillar 长文页面（SSR for SEO）

**文件：**
- 创建：`frontend/app/guide/koc-marketing-cross-border-ecommerce/page.tsx`

- [ ] **步骤 1：创建 SSR 长文页面**

这个页面必须是 Server Component 以确保搜索引擎能读取全文内容。

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Complete Guide to KOC Marketing for Cross-Border E-Commerce (2026)",
  description:
    "The definitive guide to KOC marketing: how to find, vet, and manage TikTok creators for Amazon and DTC brands. Covers AI matching, pledge protection, sample logistics, and ROI tracking.",
  openGraph: {
    title: "Complete Guide to KOC Marketing for Cross-Border E-Commerce (2026)",
    description:
      "How to find, vet, and manage KOC creators for Amazon and DTC brands. AI matching, pledge protection, sample logistics, ROI tracking.",
  },
  alternates: {
    canonical: "/guide/koc-marketing-cross-border-ecommerce",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Complete Guide to KOC Marketing for Cross-Border E-Commerce (2026)",
  description:
    "The definitive guide to KOC marketing for cross-border brands. Covers finding creators, vetting quality, preventing non-delivery, sample logistics, and ROI tracking.",
  author: { "@type": "Organization", name: "KOC Engine" },
  datePublished: "2026-06-20",
  dateModified: "2026-06-20",
  publisher: { "@type": "Organization", name: "KOC Engine" },
};

export default function KocMarketingGuidePage() {
  return (
    <>
      <JsonLd data={articleSchema} />

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block">
            ← KOC Engine
          </Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
            The Complete Guide to KOC Marketing for Cross-Border E-Commerce
          </h1>
          <p className="text-lg text-zinc-500">
            How Amazon sellers and DTC brands can leverage Key Opinion Consumers
            to drive authentic product discovery, with AI-powered matching and
            escrow protection.
          </p>
          <div className="flex items-center gap-3 mt-6 text-sm text-zinc-400">
            <span>June 2026</span>
            <span>·</span>
            <span>15 min read</span>
          </div>
        </div>

        {/* TOC */}
        <nav className="bg-gray-50 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-zinc-800 mb-3">Table of Contents</h2>
          <ol className="space-y-1 text-sm text-zinc-600 list-decimal list-inside">
            <li><a href="#what-is-koc">What is KOC Marketing?</a></li>
            <li><a href="#koc-vs-kol">KOC vs KOL: Key Differences</a></li>
            <li><a href="#finding-creators">How to Find and Vet KOC Creators</a></li>
            <li><a href="#sample-logistics">Sample Shipping and Logistics</a></li>
            <li><a href="#prevent-non-delivery">Preventing Creator Non-Delivery</a></li>
            <li><a href="#tracking-roi">Tracking Content Performance and ROI</a></li>
            <li><a href="#cost-comparison">Cost Comparison: KOC Platforms vs Manual Outreach</a></li>
            <li><a href="#getting-started">Getting Started with KOC Engine</a></li>
          </ol>
        </nav>

        {/* Content sections */}
        <div className="prose prose-zinc max-w-none space-y-12">
          <Section id="what-is-koc" title="1. What is KOC Marketing?">
            <p>
              KOC (Key Opinion Consumer) marketing is a performance-based influencer
              strategy where everyday product users — not celebrities — create authentic
              review content for brands. Unlike traditional influencer marketing (KOL),
              KOCs typically have 1,000–100,000 followers but drive 3–5× higher engagement
              rates because their audiences trust peer recommendations over celebrity
              endorsements.
            </p>
            <p>
              For cross-border e-commerce brands — Amazon sellers, Shopify DTC brands,
              and marketplace merchants — KOC marketing solves a critical problem:
              building consumer trust in foreign markets where your brand has zero
              recognition. A 60-second TikTok unboxing from a local creator does more
              for product discovery than $1,000 in PPC ads.
            </p>
            <p>
              The global influencer marketing market reached ~$197 billion in 2025,
              with KOC/UGC segments growing fastest. Chinese cross-border brands now
              allocate 10–30% of marketing budgets to influencer campaigns, up from
              ~5% two years ago.
            </p>
          </Section>

          <Section id="koc-vs-kol" title="2. KOC vs KOL: Key Differences">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left">Dimension</th>
                    <th className="border border-gray-200 p-3 text-left">KOC (Key Opinion Consumer)</th>
                    <th className="border border-gray-200 p-3 text-left">KOL (Key Opinion Leader)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Follower Count", "1K–100K", "100K–10M+"],
                    ["Cost per Post", "$50–$500 + free product", "$1,000–$50,000+"],
                    ["Engagement Rate", "3–8%", "0.5–2%"],
                    ["Content Style", "Authentic, unscripted reviews", "Polished, scripted ads"],
                    ["Conversion Intent", "High (product discovery)", "Medium (brand awareness)"],
                    ["Best For", "Amazon product launches, DTC growth", "Brand campaigns, awareness"],
                    ["Risk", "Non-delivery (mitigated by escrow)", "Low ROI on high spend"],
                  ].map(([dim, koc, kol]) => (
                    <tr key={dim}>
                      <td className="border border-gray-200 p-3 font-medium">{dim}</td>
                      <td className="border border-gray-200 p-3">{koc}</td>
                      <td className="border border-gray-200 p-3">{kol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="finding-creators" title="3. How to Find and Vet KOC Creators">
            <h3>Manual Outreach (Time-Consuming, Unreliable)</h3>
            <p>
              Scrolling TikTok/Instagram to find creators, DMing them, negotiating
              terms, tracking samples, following up on content — this takes 10–20
              hours per creator and has a ~40% ghosting rate.
            </p>
            <h3>Agency-Managed (Expensive, Opaque)</h3>
            <p>
              MCN agencies charge 20–50% markup on creator fees. You have no direct
              relationship with creators. Pricing and performance data are not transparent.
            </p>
            <h3>Platform-Based (Efficient, Accountable)</h3>
            <p>
              KOC platforms like KOC Engine use AI matching to connect brands with
              pre-vetted creators. Key features to look for:
            </p>
            <ul>
              <li><strong>Multi-dimension matching</strong> — niche, region, tier, trust score, performance history</li>
              <li><strong>Creator vetting</strong> — AI scoring + human review before creators can accept tasks</li>
              <li><strong>Escrow/pledge system</strong> — both sides have skin in the game</li>
              <li><strong>Performance tracking</strong> — views, engagement, conversions per creator</li>
              <li><strong>Transparent pricing</strong> — no hidden fees, no agency markup</li>
            </ul>
          </Section>

          <Section id="sample-logistics" title="4. Sample Shipping and Logistics">
            <p>
              Physical sample shipping is the biggest operational headache in KOC
              marketing. Cross-border shipping to creators in the US, UK, EU, or
              Japan involves customs, tracking, and delivery confirmation.
            </p>
            <p><strong>Best practices:</strong></p>
            <ul>
              <li>Use carriers with end-to-end tracking: FedEx, DHL, SF-Express for Asia→US routes</li>
              <li>Platforms with built-in tracking automation save hours of manual checking</li>
              <li>Set clear expectations: samples ship within 48h of task acceptance</li>
              <li>Creators confirm receipt with photos — this protects both sides</li>
              <li>Budget $15–$40 per sample shipment for international routes</li>
            </ul>
          </Section>

          <Section id="prevent-non-delivery" title="5. Preventing Creator Non-Delivery">
            <p>
              The #1 complaint from brands: "I shipped free products and the creator
              disappeared." KOC Engine's dual-pledge system solves this:
            </p>
            <ul>
              <li><strong>Both sides deposit before starting</strong> — brand pledges per KOC slot, KOC pledges per accepted task</li>
              <li><strong>KOC deposit only returns after brand approves content</strong> — creators have financial incentive to deliver</li>
              <li><strong>14-day submission deadline</strong> — if KOC doesn't submit, deposit is forfeited and trust score penalized</li>
              <li><strong>Brand has 4 days to review</strong> — if they don't respond, content is auto-approved</li>
              <li><strong>Public trust scores</strong> — low-trust KOCs get deprioritized in matching; repeat offenders get suspended</li>
            </ul>
          </Section>

          <Section id="tracking-roi" title="6. Tracking Content Performance and ROI">
            <p>
              Without performance data, you can't justify KOC marketing spend. Track
              these metrics per creator:
            </p>
            <ul>
              <li><strong>Reach:</strong> Video views, impressions</li>
              <li><strong>Engagement:</strong> Likes, comments, shares, saves, engagement rate</li>
              <li><strong>Conversion:</strong> Link clicks, attributed sales, revenue</li>
              <li><strong>Cost Efficiency:</strong> Cost per engagement (CPE), cost per acquisition (CPA)</li>
            </ul>
            <p>
              KOC Engine provides a real-time performance dashboard that aggregates
              all these metrics per creator and per campaign, so brands can identify
              top performers and optimize future matching.
            </p>
          </Section>

          <Section id="cost-comparison" title="7. Cost Comparison: Platforms vs Manual vs Agency">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left">Method</th>
                    <th className="border border-gray-200 p-3 text-left">Cost per Creator</th>
                    <th className="border border-gray-200 p-3 text-left">Time Investment</th>
                    <th className="border border-gray-200 p-3 text-left">Ghosting Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Manual DM Outreach", "$50–$200 + product", "10–20h per creator", "~40%"],
                    ["MCN Agency", "$500–$2,000 + product", "2–5h per campaign", "~15%"],
                    ["KOC Engine", "5pt platform fee + refundable 10pt pledge", "30min to post task", "<5% (pledge-protected)"],
                  ].map(([method, cost, time, risk]) => (
                    <tr key={method}>
                      <td className="border border-gray-200 p-3 font-medium">{method}</td>
                      <td className="border border-gray-200 p-3">{cost}</td>
                      <td className="border border-gray-200 p-3">{time}</td>
                      <td className="border border-gray-200 p-3">{risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="getting-started" title="8. Getting Started with KOC Engine">
            <ol>
              <li><strong>Create a free brand account</strong> — takes 2 minutes</li>
              <li><strong>Add your product</strong> — ASIN, category, commission structure</li>
              <li><strong>Post a task</strong> — urgent (auto-matched in minutes) or long-term (creators browse and apply)</li>
              <li><strong>Review matches</strong> — AI-suggested creators with full profile data</li>
              <li><strong>Ship samples + track delivery</strong> — built-in logistics tracking</li>
              <li><strong>Review submitted content</strong> — approve or request revisions</li>
              <li><strong>Track performance</strong> — real-time dashboard with engagement and conversion data</li>
            </ol>
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 mt-6 text-center">
              <p className="font-bold text-pink-700 mb-2">Ready to find your first KOC?</p>
              <Link
                href="/register?role=merchant"
                className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-pink-200 hover:opacity-90 transition"
              >
                🏢 Create Free Brand Account →
              </Link>
            </div>
          </Section>
        </div>
      </article>
    </>
  );
}

/* ── Reusable section wrapper ── */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-2xl font-extrabold text-zinc-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **步骤 2：添加 prose 样式到 globals.css**

```css
/* frontend/app/globals.css — 追加 */
.prose h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
.prose p {
  color: #52525b;
  line-height: 1.75;
  margin-bottom: 1rem;
}
.prose ul, .prose ol {
  color: #52525b;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.prose li {
  margin-bottom: 0.25rem;
}
```

- [ ] **步骤 3：验证编译 + 访问页面**

```bash
cd frontend && npm run build
```

访问 `http://localhost:3000/guide/koc-marketing-cross-border-ecommerce`，确认：
- 页面为 SSR（查看源码时内容在 HTML 中）
- 目录链接可点击跳转
- prose 样式正确
- JSON-LD Article schema 在 `<head>` 中

- [ ] **步骤 4：Commit**

```bash
git add frontend/app/guide/ frontend/app/globals.css
git commit -m "feat: pillar long-form KOC marketing guide (SSR, Article schema, 8 sections)"
```

---

### 任务 7：Vercel 部署配置

**文件：**
- 创建：`frontend/vercel.json`
- 修改：`frontend/next.config.ts`

- [ ] **步骤 1：创建 vercel.json**

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/sitemap.xml",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/xml"
        }
      ]
    },
    {
      "source": "/robots.txt",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/plain"
        }
      ]
    }
  ]
}
```

- [ ] **步骤 2：更新 next.config.ts 添加安全头**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境安全头（Vercel 也设置一份，双保险）
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **步骤 3：更新 .env.local 添加 SITE_URL**

```
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **步骤 4：验证构建**

```bash
cd frontend && npm run build
```

确认无错误。

- [ ] **步骤 5：Commit**

```bash
git add frontend/vercel.json frontend/next.config.ts frontend/.env.local
git commit -m "feat: Vercel deploy config + security headers + SITE_URL env"
```

---

### 任务 8：注册页角色参数支持

**文件：**
- 修改：`frontend/app/register/page.tsx`

当前注册页不支持 URL 参数预选角色。`?role=merchant` 和 `?role=koc` 从首页 CTA 传入。

- [ ] **步骤 1：读取 URL 参数预选角色**

在 `register/page.tsx` 顶部（现有文件约 10 行处）加入：

```tsx
// 在组件顶部，useState 初始化之前
import { useSearchParams } from "next/navigation";

// 组件内：
const searchParams = useSearchParams();
const preselectedRole = searchParams.get("role") || "";
```

然后将角色 state 的默认值改为：
```tsx
const [role, setRole] = useState(preselectedRole || "");
```

- [ ] **步骤 2：预选时高亮对应角色卡片**

在角色选择的卡片上，如果 `preselectedRole` 匹配，默认添加 active 样式。

- [ ] **步骤 3：验证**

访问 `http://localhost:3000/register?role=merchant` → 商家卡片默认选中。
访问 `http://localhost:3000/register?role=koc` → KOC 卡片默认选中。

- [ ] **步骤 4：Commit**

```bash
git add frontend/app/register/page.tsx
git commit -m "feat: register page supports ?role= query param pre-selection"
```

---

### 任务 9：验证与部署

- [ ] **步骤 1：Lighthouse 评分**

```bash
# 生产构建并启动
cd frontend && npm run build && npm start
```

用 Chrome DevTools Lighthouse 检查首页：
- Performance ≥ 90
- SEO = 100
- Best Practices ≥ 90

- [ ] **步骤 2：结构化数据验证**

访问 `https://search.google.com/test/rich-results`，输入本地 ngrok URL 或部署后的 URL，确认：
- Organization schema ✅
- WebApplication schema ✅
- FAQPage schema ✅（15 个 FAQ）
- Article schema ✅（长文页面）

- [ ] **步骤 3：OG 标签验证**

访问 `https://www.opengraph.xyz` 或 Twitter Card Validator，确认分享预览正确。

- [ ] **步骤 4：sitemap 验证**

访问 `/sitemap.xml`，确认返回正确的 XML 包含所有页面。

- [ ] **步骤 5：部署到 Vercel**

```bash
cd frontend
# 确保已安装 Vercel CLI 并登录
vercel --prod
```

设置环境变量：
- `NEXT_PUBLIC_API_URL` = Render 后端 URL
- `NEXT_PUBLIC_SITE_URL` = Vercel 分配的域名（或自定义域名）

- [ ] **步骤 6：Commit 最终验证结果**

```bash
git add -A
git commit -m "chore: final SEO verification — Lighthouse 90+, structured data validated"
```

---

## 验证清单

- [ ] `curl http://localhost:3000/robots.txt` 返回正确内容
- [ ] `curl http://localhost:3000/sitemap.xml` 返回 XML
- [ ] 首页 View Source 包含 JSON-LD 结构化数据
- [ ] 首页 `<title>` 和 `<meta description>` 正确
- [ ] 首页 `<meta property="og:title">` 存在
- [ ] 首页 `<meta name="twitter:card">` 存在
- [ ] 首页 `<link rel="alternate" hreflang="zh-CN">` 存在
- [ ] `/register?role=merchant` 预选商家角色
- [ ] `/guide/koc-marketing-cross-border-ecommerce` SSR 页面可访问
- [ ] Lighthouse SEO score = 100
- [ ] Rich Results Test 无错误
- [ ] Vercel 部署成功
