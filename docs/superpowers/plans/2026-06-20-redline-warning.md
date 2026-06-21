# 红线警示系统 — 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 KOC Engine 前端全链路植入红线警示——操作前弹窗确认后果、进行中倒计时颜色预警、触发后损失明细展示。

**架构：** 新增 2 个通用组件（DeadlineBadge 倒计时徽章 + CommitmentConfirm 承诺确认弹窗），改造 5 个现有页面/组件（TaskProgress、TaskCard、KOC 任务详情、商家任务详情、商家发布任务），补全商家审核 UI。纯前端改动，不涉及后端。

**技术栈：** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript

**设计规格：** `docs/superpowers/specs/2026-06-20-redline-warning-design.md`

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/components/DeadlineBadge.tsx` | **新建** | 倒计时徽章组件（绿/黄/红/逾期四态） |
| `frontend/components/CommitmentConfirm.tsx` | **新建** | 承诺确认弹窗（强制阅读 + 勾选确认） |
| `frontend/components/TaskProgress.tsx` | 修改 | 每 slot 加剩余时间倒计时 |
| `frontend/components/TaskCard.tsx` | 修改 | 卡片右上角加剩余天数角标 + 逾期标签 |
| `frontend/app/portal/tasks/[id]/page.tsx` | 修改 | 接单弹窗 + 提交倒计时 + 逾期状态 + 时间线补全 |
| `frontend/app/dashboard/tasks/[id]/page.tsx` | 修改 | 发货倒计时 + 审核 UI 补全 + 审核倒计时 |
| `frontend/app/dashboard/tasks/new/page.tsx` | 修改 | 发布前 SLA 协议勾选 |
| `frontend/lib/api.ts` | 无改动* | 已有 `tasks.review`、`tasks.ship` 等方法 |

> *api.ts 已有所有需要的 API 方法，无需修改。

---

### 任务 1：DeadlineBadge 组件

**文件：**
- 创建：`frontend/components/DeadlineBadge.tsx`

**说明：** 纯客户端组件，接收截止时间戳，实时计算剩余时间，四种颜色状态切换。使用 `useEffect` + `setInterval` 每 60 秒刷新一次（不需要每秒更新，减少重渲染）。

- [ ] **步骤 1：创建组件文件**

```typescript
"use client";

import { useState, useEffect } from "react";

interface DeadlineBadgeProps {
  deadline: string;       // ISO 8601 timestamp
  label: string;          // "提交内容" / "确认发货" / "审核内容"
  penalty?: string;       // "逾期将扣除 15 信任分"
  size?: "sm" | "md";     // sm: inline badge, md: detail page block
  className?: string;
}

type Urgency = "normal" | "warning" | "urgent" | "expired";

function calcUrgency(deadline: string): { urgency: Urgency; hoursLeft: number; daysLeft: number; text: string } {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const diffMs = deadlineMs - now;
  const hoursLeft = diffMs / (1000 * 60 * 60);
  const daysLeft = hoursLeft / 24;

  if (diffMs <= 0) {
    const daysOver = Math.abs(Math.floor(daysLeft));
    return {
      urgency: "expired",
      hoursLeft: 0,
      daysLeft: 0,
      text: daysOver === 0 ? "已逾期" : `已逾期 ${daysOver} 天`,
    };
  }

  if (daysLeft < 3) {
    const h = Math.floor(hoursLeft);
    return {
      urgency: "urgent",
      hoursLeft,
      daysLeft,
      text: h <= 24 ? `仅剩 ${h} 小时` : `仅剩 ${Math.ceil(daysLeft)} 天`,
    };
  }

  if (daysLeft < 7) {
    return {
      urgency: "warning",
      hoursLeft,
      daysLeft,
      text: `还剩 ${Math.ceil(daysLeft)} 天`,
    };
  }

  return {
    urgency: "normal",
    hoursLeft,
    daysLeft,
    text: `还剩 ${Math.ceil(daysLeft)} 天`,
  };
}

const URGENCY_STYLES: Record<Urgency, { badge: string; icon: string; pulse: boolean }> = {
  normal:  { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🟢", pulse: false },
  warning: { badge: "bg-amber-50 text-amber-700 border-amber-200",      icon: "🟡", pulse: true },
  urgent:  { badge: "bg-red-50 text-red-600 border-red-200",            icon: "🔴", pulse: true },
  expired: { badge: "bg-red-100 text-red-700 border-red-300",           icon: "⛔", pulse: false },
};

export default function DeadlineBadge({ deadline, label, penalty, size = "md", className = "" }: DeadlineBadgeProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { urgency, text } = calcUrgency(deadline);
  const style = URGENCY_STYLES[urgency];

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${style.badge} ${style.pulse ? "animate-pulse" : ""} ${className}`}>
        {style.icon} {text}
      </span>
    );
  }

  // md: full-width block for detail pages
  return (
    <div className={`rounded-xl border px-4 py-3 ${style.badge} ${style.pulse ? "animate-pulse" : ""} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <div>
          <p className="text-sm font-semibold">
            {label}：{text}
          </p>
          {penalty && urgency !== "normal" && (
            <p className="text-xs mt-0.5 opacity-80">{penalty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误（`DeadlineBadge.tsx` 无报错）。

- [ ] **步骤 3：Commit**

```bash
cd /Users/jojo/Desktop/📁\ 开发项目/koc-engine
git add frontend/components/DeadlineBadge.tsx
git commit -m "feat: add DeadlineBadge component with 4-state countdown"
```

---

### 任务 2：CommitmentConfirm 组件

**文件：**
- 创建：`frontend/components/CommitmentConfirm.tsx`

**说明：** 全屏遮罩弹窗，不可点击遮罩关闭。列出承诺条款、质押规则、红线后果。必须勾选 "我已阅读并理解" 复选框才能点击确认按钮。

- [ ] **步骤 1：创建组件文件**

```typescript
"use client";

import { useState } from "react";

interface RuleItem {
  icon: string;
  text: string;
}

interface CommitmentConfirmProps {
  open: boolean;
  title: string;
  commitments: RuleItem[];
  pledge: RuleItem[];
  redlines: RuleItem[];
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CommitmentConfirm({
  open,
  title,
  commitments,
  pledge,
  redlines,
  confirmLabel = "确认接单",
  onConfirm,
  onCancel,
}: CommitmentConfirmProps) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  function renderSection(heading: string, items: RuleItem[], headingColor: string) {
    return (
      <div className="mb-4">
        <h3 className={`text-sm font-semibold mb-2 ${headingColor}`}>{heading}</h3>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-xs text-gray-400 mb-4">请仔细阅读以下条款</p>

        {commitments.length > 0 && renderSection("📌 你的承诺", commitments, "text-blue-600")}
        {pledge.length > 0 && renderSection("💰 质押规则", pledge, "text-purple-600")}
        {redlines.length > 0 && renderSection("⛔ 红线（违约后果）", redlines, "text-red-600")}

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 mt-6 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-pink-500"
          />
          <span className="text-sm text-amber-800 font-medium">
            我已阅读并理解以上规则，知晓违约将导致质押被没收和信任分扣除
          </span>
        </label>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            ✅ {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/components/CommitmentConfirm.tsx
git commit -m "feat: add CommitmentConfirm modal with mandatory checkbox"
```

---

### 任务 3：TaskProgress 组件增强（每 slot 加倒计时）

**文件：**
- 修改：`frontend/components/TaskProgress.tsx`

**说明：** 扩展 `SlotStatus` 接口，新增时间戳字段。每个 slot 行右侧显示当前阶段的剩余时间。用 `DeadlineBadge`（sm 尺寸）显示。颜色根据紧急程度自动变化。

- [ ] **步骤 1：扩展 SlotStatus 接口并添加倒计时逻辑**

修改 `TaskProgress.tsx` 的 `SlotStatus` 接口和渲染：

```typescript
// 扩展 SlotStatus 接口（在现有字段基础上新增）
interface SlotStatus {
  slot_index: number;
  koc_anon_id: string;
  status: string;
  content_urls?: string[];
  accepted_at?: string;     // 新增：接单时间
  shipped_at?: string;      // 新增：发货时间
  received_at?: string;     // 新增：收货时间
  submitted_at?: string;    // 已有
  created_at?: string;      // 新增：任务创建时间（用于 assigned 接单倒计时）
  task_type?: string;       // 新增："urgent" | "long_term"
  max_revisions?: number;   // 新增：已用修改次数
  revision_count?: number;  // 新增：当前修改次数
}

// 新增：根据 slot 状态计算 deadline 时间戳的辅助函数
function getSlotDeadline(slot: SlotStatus): { deadline: string; label: string; penalty: string } | null {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  switch (slot.status) {
    case "assigned": {
      if (!slot.accepted_at && slot.created_at) {
        const hours = slot.task_type === "urgent" ? 12 : 7 * 24;
        const deadline = new Date(new Date(slot.created_at).getTime() + hours * HOUR).toISOString();
        return { deadline, label: "接单时限", penalty: "逾期将自动重推" };
      }
      return null;
    }
    case "accepted": {
      if (slot.accepted_at) {
        const deadline = new Date(new Date(slot.accepted_at).getTime() + 48 * HOUR).toISOString();
        return { deadline, label: "发货时限", penalty: "商家逾期未发货将退 KOC 质押 + 扣 20 信任分" };
      }
      return null;
    }
    case "shipped": {
      if (slot.shipped_at) {
        const deadline = new Date(new Date(slot.shipped_at).getTime() + 7 * DAY).toISOString();
        return { deadline, label: "收货时限", penalty: "逾期将自动确认收货" };
      }
      return null;
    }
    case "received":
    case "creating": {
      if (slot.received_at) {
        const deadline = new Date(new Date(slot.received_at).getTime() + 14 * DAY).toISOString();
        return { deadline, label: "提交时限", penalty: "逾期未提交将扣除 15 信任分 + 没收 10pt 质押" };
      }
      return null;
    }
    case "submitted": {
      if (slot.submitted_at) {
        const deadline = new Date(new Date(slot.submitted_at).getTime() + 4 * DAY).toISOString();
        return { deadline, label: "审核时限", penalty: "商家 4 天未审将自动通过" };
      }
      return null;
    }
    case "revision_requested": {
      // 3 天重交时限，从最近一次 rejected_at 算起。若无则从 submitted_at 算。
      const base = (slot as any).rejected_at || slot.submitted_at;
      if (base) {
        const deadline = new Date(new Date(base).getTime() + 3 * DAY).toISOString();
        return { deadline, label: "重交时限", penalty: "逾期未重交将按违约处理：扣 15 信任分 + 没收质押" };
      }
      return null;
    }
    default:
      return null;
  }
}
```

- [ ] **步骤 2：在 slot 行渲染倒计时**

在 `TaskProgress` 组件中，每个 slot 行（`<div key={slot.slot_index} ...>`）的右侧区域新增倒计时显示。将原有的日期和链接信息保留，在上面追加 `DeadlineBadge`：

```typescript
// 在每个 slot 的渲染中，status label 后面追加倒计时：
{slots.map((slot) => {
  const st = STATUS_LABELS[slot.status] || { label: slot.status, color: "bg-gray-100 text-gray-500" };
  const dl = getSlotDeadline(slot);
  return (
    <div key={slot.slot_index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono font-medium text-gray-700">
          {slot.koc_anon_id || `Slot #${slot.slot_index + 1}`}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
          {st.label}
        </span>
        {/* 新增：修改次数提示 */}
        {slot.status === "revision_requested" && slot.revision_count !== undefined && (
          <span className="text-xs text-orange-500 font-medium">
            ⚠️ 修改 {slot.revision_count}/{slot.max_revisions || 3}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* 新增：倒计时 */}
        {dl && (
          <DeadlineBadge
            deadline={dl.deadline}
            label={dl.label}
            penalty={dl.penalty}
            size="sm"
          />
        )}
        {/* 保留原有日期和链接信息 */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {slot.submitted_at && (
            <span>📅 {new Date(slot.submitted_at).toLocaleDateString()}</span>
          )}
          {slot.content_urls && slot.content_urls.length > 0 && (
            <span>🔗 {slot.content_urls.length} links</span>
          )}
        </div>
      </div>
    </div>
  );
})}
```

同时在文件顶部添加导入：
```typescript
import DeadlineBadge from "@/components/DeadlineBadge";
```

- [ ] **步骤 3：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 4：Commit**

```bash
git add frontend/components/TaskProgress.tsx
git commit -m "feat: add per-slot countdown deadline to TaskProgress"
```

---

### 任务 4：TaskCard 组件增强（紧急度角标 + 逾期标签）

**文件：**
- 修改：`frontend/components/TaskCard.tsx`

**说明：** 在 `TaskCard` 接口中新增可选的时间戳字段。当 KOC 已接受此任务（`mode === "hall"` 且有 `my_slot_status` 和 `my_slot_deadline`），在卡片右上角显示 `DeadlineBadge`（sm）。逾期任务整体变灰。

- [ ] **步骤 1：扩展 TaskCardProps 并渲染角标**

```typescript
// 在 TaskCardProps 接口中新增可选字段：
interface TaskCardProps {
  task: {
    task_id: string;
    product_name: string;
    product_asin: string;
    task_type: string;
    task_status: string;
    commission: number;
    koc_required: number;
    koc_filled: number;
    pledge_koc: number;
    merchant_id: string;
    merchant_company?: string;
    merchant_trust_score?: number;
    merchant_avg_rating?: number;
    target_market?: string;
    created_at: string;
    // 新增：当前 KOC 在此任务中的 slot 信息
    my_slot_status?: string;    // "accepted" | "shipped" | "received" | "submitted" | "timed_out" | ...
    my_slot_deadline?: string;  // ISO timestamp of deadline
    my_slot_deadline_label?: string;
    my_slot_deadline_penalty?: string;
  };
  mode: "hall" | "merchant";
  token: string;
}
```

在组件内引入 `DeadlineBadge`：
```typescript
import DeadlineBadge from "@/components/DeadlineBadge";
```

在卡片右上角（type badge 旁边）渲染紧急度角标：
```typescript
{/* 在 type badge 同一行，追加 deadline badge */}
<div className="flex items-center gap-2 mb-3">
  {/* ... existing type badge ... */}
  
  {/* 新增：已接任务的剩余时间 */}
  {mode === "hall" && task.my_slot_deadline && (
    <DeadlineBadge
      deadline={task.my_slot_deadline}
      label={task.my_slot_deadline_label || ""}
      penalty={task.my_slot_deadline_penalty}
      size="sm"
    />
  )}
  
  {/* 新增：已逾期标记 */}
  {mode === "hall" && task.my_slot_status === "timed_out" && (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
      ⛔ 已逾期
    </span>
  )}
  
  {/* ... rest of badges ... */}
</div>
```

逾期任务整体透明度降低：
```typescript
// 修改外层 div 的 className
<div
  className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-pink-200 transition-all duration-200 cursor-pointer group ${
    task.my_slot_status === "timed_out" ? "opacity-60" : ""
  }`}
  // ... onClick ...
>
```

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/components/TaskCard.tsx
git commit -m "feat: add urgency badge and timed-out state to TaskCard"
```

---

### 任务 5：KOC 任务详情页改造（接单弹窗 + 倒计时 + 逾期状态）

**文件：**
- 修改：`frontend/app/portal/tasks/[id]/page.tsx`

**说明：** 这是改动最大的页面。引入 `CommitmentConfirm` 和 `DeadlineBadge`。
1. 接单前弹出承诺确认弹窗
2. 提交区上方显示 14 天倒计时
3. 新增 `timed_out` 和 `revision_requested` 状态 UI
4. 补全状态时间线（加 `timed_out`、`revision_requested`、`approved`）

- [ ] **步骤 1：添加导入和新状态变量**

在文件顶部添加导入：
```typescript
import DeadlineBadge from "@/components/DeadlineBadge";
import CommitmentConfirm from "@/components/CommitmentConfirm";
```

新增状态变量（在现有 `useState` 块附近）：
```typescript
const [showCommitment, setShowCommitment] = useState(false);
```

- [ ] **步骤 2：替换接单按钮为弹窗触发**

将现有的接单按钮（`handleAccept` 直接调用 API）改为先弹窗：

```typescript
// 新增：计算提交截止时间（从接单后 14 天）
function calcSubmitDeadline() {
  const now = new Date();
  now.setDate(now.getDate() + 14);
  return now.toISOString();
}

// 新增：弹窗确认后的接单逻辑
async function handleConfirmAccept() {
  setShowCommitment(false);
  setAccepting(true);
  setError("");
  try {
    await tasks.accept(taskId, mySlotIndex, getToken()!);
    await loadTask();
  } catch (e: any) {
    setError(e.message || "接单失败");
  } finally {
    setAccepting(false);
  }
}
```

替换接单按钮区域（`isAssignedToMe` 分支），将原来的 `<button onClick={handleAccept}>` 改为触发弹窗：

```typescript
{isAssignedToMe && (
  <div className="space-y-2">
    <button
      onClick={() => setShowCommitment(true)}
      disabled={accepting}
      className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
    >
      {accepting ? "接单中..." : "✅ 接单（质押 10 点）"}
    </button>
    
    {/* 承诺确认弹窗 */}
    <CommitmentConfirm
      open={showCommitment}
      title="⚠️ 确认接单前，请知悉"
      commitments={[
        { icon: "📦", text: "收到商家寄出的样品后开始创作" },
        { icon: "📹", text: "14 天内提交原创内容（视频/图文）" },
        { icon: "🔗", text: "内容发布后提交链接到平台" },
        { icon: "📊", text: "提交后可在平台更新内容表现数据" },
      ]}
      pledge={[
        { icon: "🔒", text: "接单冻结 10 点质押" },
        { icon: "💵", text: "完成后退还 5 点（平台扣 5 点服务费）" },
        { icon: "💰", text: "佣金走产品返佣链接，平台点数不参与佣金发放" },
      ]}
      redlines={[
        { icon: "⏰", text: "14 天内未提交内容 → 没收 10pt 质押 + 扣 15 信任分 + 可能降级" },
        { icon: "🚫", text: "拒绝接单 → 扣 3 信任分" },
        { icon: "📋", text: "最多同时进行 5 个任务" },
        { icon: "🛡️", text: "商家 48h 不发货 → 退你质押 + 商家扣 20 分" },
      ]}
      confirmLabel="确认接单"
      onConfirm={handleConfirmAccept}
      onCancel={() => setShowCommitment(false)}
    />
    
    <button
      onClick={handleReject}
      disabled={rejecting}
      className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {rejecting ? "拒绝中..." : "❌ 拒绝（-3 信任分）"}
    </button>
    <p className="text-xs text-gray-400 text-center">
      接单冻结 10 点质押，完成后退还 5 点（平台扣 5 点服务费）
    </p>
  </div>
)}
```

- [ ] **步骤 3：提交区上方加倒计时**

在 `canSubmit` 分支的 `<textarea>` 上方，根据 `mySlot` 时间戳计算 14 天或 3 天截止时间并显示 `DeadlineBadge`：

```typescript
{canSubmit && (
  <div className="space-y-3">
    {/* 新增：截止时间倒计时 */}
    {mySlot?.received_at && slotStatus !== "revision_requested" && (
      <DeadlineBadge
        deadline={new Date(new Date(mySlot.received_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()}
        label="提交内容截止"
        penalty="逾期未提交将扣除 15 信任分 + 没收 10pt 质押"
        size="md"
      />
    )}
    {slotStatus === "revision_requested" && (
      <DeadlineBadge
        deadline={new Date(new Date((mySlot as any).rejected_at || mySlot.submitted_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()}
        label="修改重交截止"
        penalty={`逾期未重交将按违约处理：扣 15 信任分 + 没收质押（已修改 ${(mySlot as any).revision_count || 0}/${(mySlot as any).max_revisions || 3} 次）`}
        size="md"
      />
    )}
    
    {/* ... 原有的 textarea + submit button ... */}
  </div>
)}
```

- [ ] **步骤 4：新增 timed_out 状态展示**

在 `slotStatus === "completed"` 区块**之前**，新增 `timed_out` 状态：

```typescript
{slotStatus === "timed_out" && (
  <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6 text-center mt-4">
    <div className="text-3xl mb-2">⛔</div>
    <p className="font-bold text-red-700 text-lg">该任务已逾期</p>
    <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
      <div className="flex items-center gap-2 text-sm text-red-600">
        <span>💸</span>
        <span>质押 10pt 已退还商家</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-red-600">
        <span>📉</span>
        <span>信任分 -15</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-red-600">
        <span>⚠️</span>
        <span>等级可能已降级</span>
      </div>
    </div>
    <p className="text-xs text-red-400 mt-4">
      请遵守平台规则，避免再次逾期
    </p>
  </div>
)}
```

- [ ] **步骤 5：新增 revision_requested 状态展示（在 submitted 等待审核基础上）**

在现有的 `submitted` 等待审核区块之外，为 `revision_requested` 增加独立展示：

```typescript
{slotStatus === "revision_requested" && (
  <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 text-center mt-4">
    <div className="text-3xl mb-2">✏️</div>
    <p className="font-semibold text-orange-700 text-lg">商家要求修改内容</p>
    {(mySlot as any)?.review_feedback && (
      <div className="mt-3 bg-white rounded-xl p-4 text-left">
        <p className="text-xs text-gray-400 mb-1">商家反馈：</p>
        <p className="text-sm text-gray-700">{(mySlot as any).review_feedback}</p>
      </div>
    )}
    <p className="text-xs text-orange-500 mt-3">
      请在 3 天内修改并重新提交（已修改 {(mySlot as any)?.revision_count || 0}/{(mySlot as any)?.max_revisions || 3} 次）
    </p>
    {mySlot?.content_urls && (
      <div className="mt-3 space-y-1">
        {(mySlot.content_urls as string[]).map((url: string, i: number) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
             className="block text-sm text-pink-500 hover:text-pink-600">
            🔗 {url}
          </a>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **步骤 6：补全状态时间线**

扩展时间线数组，加入缺失的状态：

```typescript
{[
  { key: "assigned", label: "待接单", done: ["assigned", "accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
  { key: "accepted", label: "已接单", done: ["accepted", "shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
  { key: "shipped", label: "商家已发货", done: ["shipped", "received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
  { key: "received", label: "已收货", done: ["received", "creating", "submitted", "approved", "completed"].includes(slotStatus) },
  { key: "submitted", label: "已提交内容", done: ["submitted", "approved", "completed"].includes(slotStatus) },
  { key: "approved", label: "商家审核通过", done: ["approved", "completed"].includes(slotStatus) },
  // 异常状态
  ...(slotStatus === "revision_requested" ? [{ key: "revision_requested", label: "需修改重交", done: false }] : []),
  ...(slotStatus === "timed_out" ? [{ key: "timed_out", label: "已逾期", done: false }] : []),
].map((step) => (
  <div key={step.key} className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
      step.done ? "bg-green-500 text-white" :
      step.key === "revision_requested" ? "bg-orange-500 text-white" :
      step.key === "timed_out" ? "bg-red-500 text-white" :
      "bg-gray-200 text-gray-400"
    }`}>
      {step.done ? "✓" : step.key === "timed_out" ? "✗" : ""}
    </div>
    <span className={`text-sm ${
      step.done ? "text-gray-900 font-medium" :
      step.key === "timed_out" ? "text-red-600 font-medium" :
      "text-gray-400"
    }`}>
      {step.label}
    </span>
  </div>
))}
```

- [ ] **步骤 7：主动接单区也加弹窗**

在 `canClaim` 分支中（第 390-399 行），同样需要触发 `CommitmentConfirm`。做法与 `isAssignedToMe` 分支一致。

- [ ] **步骤 8：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 9：Commit**

```bash
git add frontend/app/portal/tasks/\[id\]/page.tsx
git commit -m "feat: add commitment modal, countdown, timed-out/revision states to KOC task detail"
```

---

### 任务 6：商家任务详情页改造（发货倒计时 + 审核 UI 补全）

**文件：**
- 修改：`frontend/app/dashboard/tasks/[id]/page.tsx`

**说明：** 
1. 发货区加 48h 倒计时 + 逾期警告
2. **补全审核 UI**：当前商家端完全没有审核 KOC 提交内容的功能。在 progress tab 中，每个 `submitted` 或 `approved` 的 slot 显示 Approve/Reject 按钮 + 审核倒计时。

- [ ] **步骤 1：添加导入**

```typescript
import DeadlineBadge from "@/components/DeadlineBadge";
```

新增状态变量：
```typescript
const [reviewFeedback, setReviewFeedback] = useState<Record<number, string>>({});
const [reviewing, setReviewing] = useState<Record<number, boolean>>({});
```

- [ ] **步骤 2：发货区加倒计时**

在现有 ship button 区域（`task.task_status === "accepted"` 分支），物流单号输入框上方加 `DeadlineBadge`：

```typescript
{["accepted"].includes(task.task_status) && (
  <div className="flex flex-col gap-2 w-64">
    {/* 新增：48h 倒计时 — 从第一个 accepted slot 的 accepted_at 算起 */}
    {kocSlots.some((s: any) => s.status === "accepted" && s.accepted_at) && (
      <DeadlineBadge
        deadline={new Date(new Date(
          kocSlots.find((s: any) => s.status === "accepted" && s.accepted_at)!.accepted_at
        ).getTime() + 48 * 60 * 60 * 1000).toISOString()}
        label="发货截止"
        penalty="逾期未发货将退 KOC 质押 + 扣 20 信任分"
        size="sm"
      />
    )}
    {/* ... 原有的 input + button ... */}
  </div>
)}
```

- [ ] **步骤 3：审核 UI — 审核处理函数**

```typescript
async function handleReview(slotIndex: number, action: "approve" | "reject") {
  const feedback = action === "reject" ? (reviewFeedback[slotIndex] || "").trim() : "Approved";
  if (action === "reject" && !feedback) {
    setError("请填写驳回理由");
    return;
  }
  setReviewing((prev) => ({ ...prev, [slotIndex]: true }));
  setError("");
  try {
    await tasks.review(taskId, slotIndex, action, feedback, token!);
    await loadTask();
    // 清除该 slot 的 feedback
    setReviewFeedback((prev) => { const n = { ...prev }; delete n[slotIndex]; return n; });
  } catch (e: any) {
    setError(e.message || "审核失败");
  } finally {
    setReviewing((prev) => ({ ...prev, [slotIndex]: false }));
  }
}
```

- [ ] **步骤 4：审核 UI — 在 progress tab 中为 submitted/approved slot 渲染审核区**

在 `tab === "progress"` 区域，`TaskProgress` 组件下方，新增审核区：

```typescript
{tab === "progress" && (
  <div className="space-y-6">
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <TaskProgress
        slots={kocSlots.map((s: any, i: number) => ({
          slot_index: i,
          koc_anon_id: s.koc_id ? `KOC-${s.koc_id.slice(0, 4).toUpperCase()}` : "-",
          status: s.status || "unknown",
          accepted_at: s.accepted_at || "",
          shipped_at: s.shipped_at || "",
          received_at: s.received_at || "",
          submitted_at: s.submitted_at || "",
          content_urls: s.content_urls || [],
          created_at: task.created_at || "",
          task_type: task.task_type || "",
          revision_count: s.revision_count,
          max_revisions: s.max_revisions,
        }))}
      />
    </div>

    {/* 新增：审核区 — 每个 submitted 或 revision_requested 的 slot */}
    {kocSlots.filter((s: any) => s.status === "submitted" || s.status === "revision_requested" || s.status === "approved").length > 0 && (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">📋 内容审核</h2>
        <div className="space-y-4">
          {kocSlots.map((s: any, i: number) => {
            if (!["submitted", "revision_requested", "approved"].includes(s.status)) return null;
            const isReviewing = reviewing[i] || false;
            const dl = s.submitted_at
              ? new Date(new Date(s.submitted_at).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()
              : null;

            return (
              <div key={i} className={`border rounded-xl p-4 ${
                s.status === "approved" ? "border-green-200 bg-green-50/30" :
                s.status === "revision_requested" ? "border-orange-200 bg-orange-50/30" :
                "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-medium text-gray-700">
                    KOC-{(s.koc_id || "").slice(0, 4).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "approved" ? "bg-green-100 text-green-700" :
                      s.status === "revision_requested" ? "bg-orange-100 text-orange-600" :
                      "bg-blue-100 text-blue-600"
                    }`}>
                      {s.status === "approved" ? "✅ 已通过" :
                       s.status === "revision_requested" ? "✏️ 已驳回" :
                       "📩 待审核"}
                    </span>
                    {dl && s.status !== "approved" && (
                      <DeadlineBadge
                        deadline={dl}
                        label="审核截止"
                        penalty="4 天未审将自动通过"
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                {/* KOC 提交的内容链接 */}
                {s.content_urls && s.content_urls.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {s.content_urls.map((url: string, j: number) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                         className="block text-sm text-pink-500 hover:text-pink-600 truncate">
                        🔗 {url}
                      </a>
                    ))}
                  </div>
                )}

                {/* 已驳回的反馈 */}
                {s.status === "revision_requested" && s.review_feedback && (
                  <div className="mb-3 p-3 bg-white rounded-lg text-sm">
                    <span className="text-xs text-gray-400">驳回理由：</span>
                    <span className="text-gray-700">{s.review_feedback}</span>
                  </div>
                )}

                {/* Approve / Reject 按钮（仅 submitted 或 revision_requested） */}
                {(s.status === "submitted" || s.status === "revision_requested") && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(i, "approve")}
                        disabled={isReviewing}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {isReviewing ? "处理中..." : "✅ 通过"}
                      </button>
                      <button
                        onClick={() => {
                          const fb = reviewFeedback[i] || "";
                          if (!fb.trim()) {
                            const input = prompt("请输入驳回理由（KOC 将看到此反馈）：");
                            if (input) {
                              setReviewFeedback((prev) => ({ ...prev, [i]: input }));
                              handleReview(i, "reject");
                            }
                          }
                        }}
                        disabled={isReviewing}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isReviewing ? "处理中..." : "❌ 驳回"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 系统自动通过说明 */}
                {s.status === "approved" && s.auto_approved && (
                  <p className="text-xs text-gray-400 mt-2">
                    ⚠️ 系统自动通过（商家超时未审）
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **步骤 5：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 6：Commit**

```bash
git add frontend/app/dashboard/tasks/\[id\]/page.tsx
git commit -m "feat: add ship countdown, review UI with approve/reject to merchant task detail"
```

---

### 任务 7：商家发布任务 — SLA 协议

**文件：**
- 修改：`frontend/app/dashboard/tasks/new/page.tsx`

**说明：** 费用预估区下方新增 SLA 协议勾选区。必须勾选 "我已阅读并同意以上规则" 才能点击发布按钮。

- [ ] **步骤 1：添加协议状态和修改发布按钮**

在现有 `useState` 块中添加：
```typescript
const [slaAgreed, setSlaAgreed] = useState(false);
```

在费用预估区（`bg-gray-50 rounded-xl p-4` 区块）**之后**、发布按钮**之前**，插入 SLA 协议区：

```typescript
{/* SLA 协议 */}
<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
  <h3 className="text-sm font-bold text-amber-800 mb-3">📋 发布前确认</h3>
  <p className="text-xs text-amber-700 mb-3">作为商家，你承诺：</p>
  <div className="space-y-2">
    {[
      { text: "48 小时内发货", sub: "逾期扣 20 信任分 + 退还 KOC 质押" },
      { text: "4 天内审核 KOC 提交的内容", sub: "逾期系统自动通过" },
      { text: "平台服务费 5pt 发布即扣，不可退" },
      { text: `每 slot 质押 10pt（共 ${10 * form.koc_required}pt），KOC 完成后退还` },
    ].map((item, i) => (
      <label key={i} className="flex items-start gap-2 text-sm text-amber-700 cursor-pointer">
        <span className="mt-0.5">☐</span>
        <span>
          <strong>{item.text}</strong>
          <span className="text-xs text-amber-500 block">{item.sub}</span>
        </span>
      </label>
    ))}
  </div>
  <label className="flex items-start gap-3 mt-4 p-3 bg-white rounded-xl border border-amber-300 cursor-pointer">
    <input
      type="checkbox"
      checked={slaAgreed}
      onChange={(e) => setSlaAgreed(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded accent-pink-500"
    />
    <span className="text-sm text-amber-800 font-medium">
      我已阅读并同意以上规则，知晓违约将导致信任分扣除和质押损失
    </span>
  </label>
</div>
```

修改发布按钮，加 `disabled={!slaAgreed}`：

```typescript
<button
  onClick={handleSubmit}
  disabled={submitting || !slaAgreed}
  className="w-full btn-brand text-white py-3.5 rounded-xl font-semibold text-lg disabled:opacity-50"
>
  {submitting ? "发布中..." : "🚀 发布任务"}
</button>
```

- [ ] **步骤 2：验证编译**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增类型错误。

- [ ] **步骤 3：Commit**

```bash
git add frontend/app/dashboard/tasks/new/page.tsx
git commit -m "feat: add SLA agreement checkbox before task publish"
```

---

### 任务 8：全量验证

**文件：** 无新建，执行验证命令。

- [ ] **步骤 1：TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

预期：无类型错误。

- [ ] **步骤 2：生产构建检查**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

预期：构建成功，无错误。确认所有页面静态生成 / SSR 正常。

- [ ] **步骤 3：后端语法检查**

```bash
cd backend && python3 -m py_compile main.py && python3 -m py_compile models.py && python3 -m py_compile config.py && echo "OK"
```

预期：`OK`

- [ ] **步骤 4：E2E 测试**

```bash
cd backend && python3 -m pytest tests/test_v2_e2e.py -v 2>&1 | tail -30
```

预期：全量 E2E 测试通过。

- [ ] **步骤 5：手动验证清单**

启动前后端后手动检查：

| 检查点 | 路径 | 验证内容 |
|--------|------|---------|
| KOC 接单弹窗 | `/portal/tasks/{id}` (assigned slot) | 弹窗显示承诺/质押/红线，不勾选无法确认 |
| KOC 提交倒计时 | `/portal/tasks/{id}` (received slot) | 显示 14 天倒计时 DeadgeBadge |
| KOC 逾期状态 | `/portal/tasks/{id}` (timed_out slot) | 红色卡片 + 损失明细 |
| 商家发货倒计时 | `/dashboard/tasks/{id}` (accepted) | 48h 倒计时 |
| 商家审核 UI | `/dashboard/tasks/{id}` (submitted slot) | Approve/Reject 按钮 + 4 天倒计时 |
| 商家发布协议 | `/dashboard/tasks/new` | 不勾选 SLA 无法发布 |
| TaskProgress 倒计时 | `/dashboard/tasks/{id}` (progress tab) | 每个 slot 有剩余时间 |
| TaskCard 角标 | `/portal/hall` | 已接任务显示剩余天数 |

- [ ] **步骤 6：Commit**

```bash
git add -A
git commit -m "chore: verify full redline warning system build + e2e"
```

---

## 自检

**1. 规格覆盖度：**
- ✅ DeadlineBadge 组件 → 任务 1
- ✅ CommitmentConfirm 组件 → 任务 2
- ✅ TaskProgress 倒计时 → 任务 3
- ✅ TaskCard 角标 + 逾期标签 → 任务 4
- ✅ KOC 任务详情（接单弹窗 + 提交倒计时 + 逾期 + 时间线）→ 任务 5
- ✅ 商家任务详情（发货倒计时 + 审核 UI + 审核倒计时）→ 任务 6
- ✅ 商家发布 SLA 协议 → 任务 7
- ✅ 全量验证 → 任务 8

**2. 占位符扫描：**
- 无 "TODO"、"待定"、"后续实现"

**3. 类型一致性：**
- `DeadlineBadge` 的 Props 在任务 1 定义，任务 3/4/5/6 引用一致
- `CommitmentConfirm` 的 Props 在任务 2 定义，任务 5 引用一致
- `SlotStatus` 扩展字段在任务 3 定义，任务 6 使用一致
