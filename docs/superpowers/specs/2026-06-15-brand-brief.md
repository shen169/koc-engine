# KOC Engine · Brand Brief

> 方向：活力社交 · Creator-First
> 辨识度：火花符号 (Spark) + 交互语言
> 状态：已确认，前端按此实现

---

## 1. Color System

### 1.1 Brand Palette

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Brand Pink | `#EC4899` | `pink-500` | 链接、hover、主色调 |
| Brand Purple | `#8B5CF6` | `purple-500` | 二级按钮、tag、violet 强调 |
| Gradient Primary | `135deg, #EC4899 → #8B5CF6` | — | Hero 标题、主 CTA、品牌标记、步骤数字 |
| Gradient Stat | `135deg, #EC4899 → #06B6D4` | — | 统计数字、数据高亮 |
| Accent Cyan | `#06B6D4` | `cyan-500` | 信息提示、辅助链接 |

### 1.2 Functional Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Success | `#10B981` | `emerald-500` | 履约完成、点数到账、已匹配、Approved |
| Success Bg | `#D1FAE5` | `emerald-100` | 成功状态背景 |
| Warning | `#F59E0B` | `amber-500` | 待审核、pending、watching |
| Warning Bg | `#FEF3C7` | `amber-100` | 警告状态背景 |
| Danger | `#F43F5E` | `rose-500` | 拉黑、拒绝、逾期、Ghosted |
| Danger Bg | `#FFE4E6` | `rose-100` | 危险状态背景 |

### 1.3 Tier Colors（KOC 等级）

| Tier | Badge Bg | Badge Text | Badge Border |
|------|----------|------------|--------------|
| L1 体验官 | `#FDF2F8` pink-50 | `#BE185D` pink-700 | `#FBCFE8` pink-200 |
| L2 创作官 | `#F5F3FF` purple-50 | `#6D28D9` purple-700 | `#DDD6FE` purple-200 |
| L3 合伙人 | `linear-gradient(135deg, #EC4899, #8B5CF6)` | `#FFF` white | — |

### 1.4 Neutral / Surface

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Text Primary | `#18181B` | `zinc-900` | 正文、标题 |
| Text Secondary | `#52525B` | `zinc-600` | 副标题、表单标签 |
| Text Muted | `#71717A` | `zinc-500` | 辅助文字、placeholder |
| Text Disabled | `#A1A1AA` | `zinc-400` | 禁用态文字 |
| Border Default | `#E4E4E7` | `zinc-200` | 默认边框 |
| Border Light | `#FFE4E6` | `rose-100` | 卡片细边框（品牌色） |
| Surface White | `#FFFFFF` | `white` | 卡片、弹窗、表单 |
| Surface Warm | `#FFF7ED` | `orange-50` | KOC 门户背景 |
| Surface Pink | `#FDF2F8` | `pink-50` | Hero 区域、KOC 强调区 |
| Surface Purple | `#F5F3FF` | `purple-50` | 商家门户背景 |
| Surface Neutral | `#F9FAFB` | `gray-50` | Admin 背景 |
| Surface Dark | `#18181B` | `zinc-900` | Footer |

### 1.5 Page Backgrounds by Role

| Role | Background | 理由 |
|------|-----------|------|
| 公开页 (landing/apply) | `linear-gradient(135deg, #FFF7ED, #FDF2F8, #F5F3FF)` | 三色渐变，品牌全貌 |
| KOC 门户 | `#FFF7ED` orange-50 | 温暖、创作者友好 |
| 商家门户 | `#F5F3FF` purple-50 | 专业、信任感 |
| Admin | `#F9FAFB` gray-50 | 中性、效率优先 |

---

## 2. Typography

### 2.1 Font Stack

```
font-family: 'Inter', system-ui, -apple-system, sans-serif;
font-family: 'JetBrains Mono', 'Fira Code', monospace;  /* 折扣码、数据 */
```

### 2.2 Type Scale

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| Hero | `48px` / `text-5xl` | 1.1 (tracking-tight) | 800 ExtraBold | 首页大标题 |
| H1 | `30px` / `text-3xl` | 1.2 | 800 ExtraBold | 页面标题 |
| H2 | `24px` / `text-2xl` | 1.3 | 700 Bold | Section 标题 |
| H3 | `18px` / `text-lg` | 1.4 | 700 Bold | 卡片标题 |
| Body | `16px` / `text-base` | 1.5 | 400 Regular | 正文 |
| Body Small | `14px` / `text-sm` | 1.5 | 400 Regular | 辅助文字、标签内文字 |
| Caption | `12px` / `text-xs` | 1.5 | 400 Regular | 时间戳、统计说明 |
| Stat Number | `36px` / `text-4xl` | 1.0 | 800 ExtraBold | 统计数字（渐变文字） |
| Code | `14px` / `text-sm` | 1.6 | 500 Medium | 折扣码、ID 展示 |

### 2.3 Font Loading

```html
<!-- layout.tsx -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

---

## 3. Border Radius System

| Element | Value | Tailwind | 说明 |
|---------|-------|----------|------|
| Button | `9999px` | `rounded-full` | 胶囊形，社交 App 感 |
| Input / Select | `12px` | `rounded-xl` | 圆润但保留输入框辨识度 |
| Card | `16px` | `rounded-2xl` | 卡片主体 |
| Modal / Dialog | `20px` | `rounded-[20px]` | 弹窗更圆润 |
| Badge / Tag | `9999px` | `rounded-full` | 胶囊形标签 |
| Avatar / Icon Button | `9999px` | `rounded-full` | 圆形头像 |
| Step Number | `9999px` | `rounded-full` | 步骤圆圈 |
| Toast | `12px` | `rounded-xl` | 通知条 |
| Tab / Segmented Control | `9999px` | `rounded-full` | 胶囊分页 |

---

## 4. Shadows / Elevation

| Level | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| None | `none` | — | 输入框、表格行 |
| Card | `0 1px 3px rgba(0,0,0,0.04)` | `shadow-sm` | 卡片（和 border 配合） |
| Button Glow | `0 4px 20px rgba(236,72,153,0.25)` | — | 主按钮（粉光） |
| Modal | `0 20px 60px rgba(0,0,0,0.12)` | `shadow-2xl` | 弹窗、下拉菜单 |
| Nav | `0 1px 2px rgba(0,0,0,0.04)` | `shadow-sm` | 顶部导航（细线+微影） |

### Button Glow 完整 CSS：

```css
.btn-brand {
  box-shadow: 0 4px 20px rgba(236, 72, 153, 0.25);
}
.btn-brand:hover {
  box-shadow: 0 6px 28px rgba(236, 72, 153, 0.35);
}
```

---

## 5. Spacing System

| Scale | Value | Usage |
|-------|-------|-------|
| Page Padding X | `24px` `px-6` | 页面两侧 |
| Page Padding Y | `64-96px` `py-16` ~ `py-24` | Section 间距 |
| Section Gap | `64px` `gap-16` | Hero → Value Props → How It Works |
| Card Grid Gap | `20px` `gap-5` | 卡片网格 |
| Form Field Gap | `16px` `gap-4` / `space-y-4` | 表单项间距 |
| Inline Gap | `12px` `gap-3` | 按钮组、tag 组 |
| Nav Height | `56px` `h-14` | 顶部导航 |
| Container Max | `1280px` `max-w-6xl` | 内容区最大宽度 |
| Container Narrow | `672px` `max-w-2xl` | 表单、详情页 |
| Card Padding | `24-32px` `p-6` ~ `p-8` | 卡片内边距 |

---

## 6. Component Specifications

### 6.1 Button

| Variant | Bg | Text | Border | Radius | Shadow | Hover |
|---------|-----|------|--------|--------|--------|-------|
| Primary | Brand gradient | White | none | `rounded-full` | pink glow | 加深渐变 + 加大辉光 |
| Secondary | White | zinc-900 | `2px zinc-200` | `rounded-full` | none | border → pink-300 |
| Danger | `rose-500` | White | none | `rounded-full` | rose glow | `rose-600` |
| Ghost | transparent | pink-500 | none | `rounded-full` | none | `pink-50` bg |
| Disabled | `zinc-100` | `zinc-400` | none | `rounded-full` | none | — |

**Sizes**:
- `lg`: `px-8 py-3.5 text-lg` (CTA)
- `md`: `px-6 py-2.5 text-sm` (表单)
- `sm`: `px-3 py-1.5 text-xs` (操作)

### 6.2 Input / Select / Textarea

```
rounded-xl       # 12px
border-2         # 2px solid zinc-200
px-4 py-2.5      # 内边距
text-base         # 16px
bg-white          # 白色背景
```

**States**:
- Default: `border-zinc-200`
- Focus: `border-pink-400 ring-4 ring-pink-500/10` (粉光)
- Error: `border-rose-400 ring-4 ring-rose-500/10`
- Disabled: `bg-zinc-50 text-zinc-400`

### 6.3 Card

```
rounded-2xl          # 16px
border               # border-rose-100 (品牌细边框)
shadow-sm            # 微阴影
p-6 ~ p-8            # 24-32px 内边距
bg-white             # 白色
```

**Variants**:
- Default: 白底 + rose 细边框
- Highlight: 白底 + `border-l-4 border-pink-500` (左侧强调)
- Success: `bg-emerald-50 border-emerald-200`
- Danger: `bg-rose-50 border-rose-200`

### 6.4 Badge / Tag

```
rounded-full         # 胶囊形
px-2.5 py-0.5        # 内边距
text-xs font-semibold # 12px 加粗
```

| Type | Bg | Text |
|------|-----|------|
| L1 | `pink-50` | `pink-700` |
| L2 | `purple-50` | `purple-700` |
| L3 | brand gradient | `white` |
| Approved/Delivered | `emerald-50` | `emerald-700` |
| Pending | `amber-50` | `amber-700` |
| Rejected/Ghosted | `rose-50` | `rose-700` |
| Info | `cyan-50` | `cyan-700` |

### 6.5 Navigation

```
h-14                 # 56px
bg-white             # 白色
border-b             # zinc-100 底边
shadow-sm            # 微阴影
px-6                 # 24px 水平内边距
```

### 6.6 Modal / Dialog

```
rounded-[20px]       # 20px 圆角
p-8                  # 32px 内边距
shadow-2xl           # 深层阴影
bg-white             # 白色
max-w-md             # 最大宽度 448px
```

### 6.7 Tab / Segmented Control

```
rounded-full         # 胶囊形容器
bg-zinc-100          # 容器背景
p-1                  # 4px 内边距
```

Tab item:
```
rounded-full px-4 py-2 text-sm font-medium
Active: bg-white text-zinc-900 shadow-sm
Inactive: text-zinc-500 hover:text-zinc-700
```

---

## 7. Spark Symbol

### 7.1 定义

品牌视觉锚点——"匹配"的视觉化。形式：渐变色 8 角星 ✦，中心发光。

```
形状: 菱形/星形 (✦)
颜色: brand gradient (pink→purple)
辉光: 0 0 20px rgba(236,72,153,0.4)
尺寸: 24px (小) / 48px (中) / 80px (大)
动画: 缓慢旋转 + 呼吸辉光 (3s ease-in-out infinite)
```

### 7.2 出现位置

| 位置 | 尺寸 | 何时出现 |
|------|------|---------|
| Favicon | 32px | 始终 |
| Nav logo 旁 | 24px | 始终 |
| 匹配弹窗中心 | 80px | 匹配成功 |
| 加载 spinner | 48px | 数据加载 |
| 空状态占位 | 48px | 无数据 |
| AI 评分完成 | 48px | 评分结束 |

### 7.3 实现

```tsx
// components/Spark.tsx
export function Spark({ size = 48, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <div
      className={`${animate ? "animate-spark-pulse" : ""}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #EC4899, #8B5CF6)",
        clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        filter: "drop-shadow(0 0 12px rgba(236,72,153,0.4))",
      }}
    />
  );
}
```

---

## 8. Key Interactions & Animations

### 8.1 Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Duration Fast | `150ms` | hover、focus 过渡 |
| Duration Normal | `300ms` | 状态切换、卡片展开 |
| Duration Slow | `500ms` | 弹窗进出、评分动画 |
| Easing Default | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准缓动 |
| Easing Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹跳效果（点数到账） |
| Spark Pulse | `3s` ease-in-out infinite | 火花呼吸 |

### 8.2 AI 评分结算动画

流程：
1. 提交表单 → Spark 出现，旋转
2. 0.5s → 原生度数字滚动亮起（Authenticity 85✨）
3. 0.8s → 垂直度数字滚动亮起（Niche 90✨）
4. 1.1s → 带货力数字滚动亮起（Engagement 70✨）
5. 1.4s → 综合分放大 + Tier 徽章弹出
6. 完成后 Spark 停止旋转，辉光亮起

### 8.3 匹配成功动画

1. 全屏 `pink-500/10` → `purple-500/10` 渐变遮罩 fadeIn (200ms)
2. Spark 居中放大出现，带缩放弹性 (scale 0→1.2→1, 500ms)
3. 火花粒子向四周飞出 (8 个方向, 600ms)
4. 文字 "You're matched with XXX!" fadeIn + slideUp (400ms delay)
5. 持续 3 秒后自动关闭，或点击关闭

### 8.4 点数到账动画

1. 确认履约 → 🪙 图标从上方掉落 (translateY: -60 → 0, 400ms bounce)
2. "+30" 数字跟随出现，放大后缩小到正常 (scale 0→1.3→1, 500ms)
3. 余额数字更新，带短暂颜色高亮
4. 1.5s 后全部回归静态

### 8.5 状态流转过渡

所有状态变更带 300ms `bg` 颜色渐变过渡，不瞬切。

```css
transition: background-color 300ms, color 300ms, border-color 300ms;
```

---

## 9. Empty States

所有空状态统一用：
- Spark 符号居中（48px, 半透明）
- 一行引导文字（`text-zinc-400 text-sm`）
- 可选 CTA 按钮

```
┌────────────────────────────┐
│                            │
│         ✦ (48px)          │
│   No products yet.         │
│   [Add your first product] │
│                            │
└────────────────────────────┘
```

---

## 10. Implementation Checklist

- [ ] `layout.tsx` — 加载 Inter + JetBrains Mono 字体
- [ ] `globals.css` — 添加 brand gradient utilities, animation keyframes
- [ ] `tailwind.config` — 扩展 colors, animation, boxShadow
- [ ] `components/Spark.tsx` — 火花符号组件
- [ ] `components/BrandButton.tsx` — 主按钮（含辉光）
- [ ] `components/BrandCard.tsx` — 卡片组件
- [ ] `components/BrandBadge.tsx` — 标签组件（含 Tier 样式）
- [ ] 全部页面按 brand brief 重写
- [ ] AI 评分页 → 结算动画
- [ ] Admin 匹配页 → 匹配成功弹窗
- [ ] 点数系统 → 点数到账动画
