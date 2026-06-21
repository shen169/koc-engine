# 红线警示系统 — 设计规格

> 让商家和 KOC 在承诺前看清后果，进行中感知紧迫，触发后明确损失。

## 问题

平台的质押经济 + SLA 超时惩罚机制在后台完整运行，但前端几乎没有前置警示：
- KOC 接单时只看到 "质押 10 点"，不知道 14 天不提交会扣 15 信任分
- 商家发货没有 48h 倒计时，不知道逾期扣 20 信任分
- 没有任何倒计时、颜色预警、全局提醒
- 用户被扣分扣质押时才意识到严重性 → 双向体验灾难

## 目标

在三个时刻、用三个颜色，把红线规则前置到用户决策点：

```
🟢 操作前：明确告知承诺 + 违约后果（弹窗确认）
🟡 进行中：倒计时 + 颜色预警（绿→黄→红）
🔴 触发后：损失明细 + 影响说明
```

## SLA 红线速查表

| 阶段 | 责任人 | 时限 | 超时动作 | 信任分变化 |
|------|--------|------|----------|:--:|
| 接单 | KOC | 12h(urgent) / 7d(long) | 自动重推 | — |
| 发货 | 商家 | 48h | 退 KOC 质押 + 扣商家分 | -20 |
| 确认收货 | KOC | 7d | 自动确认 | — |
| 提交内容 | KOC | 14d | 退商家质押 + 扣 KOC 分 | -15 |
| 审核内容 | 商家 | 4d | 自动通过 | — |
| 修改重交 | KOC | 3d | 按 KOC 违约处理 | -15 |
| 拒绝接单 | KOC | — | 扣信任分 | -3 |
| 修改超限 | KOC | 3次 | 按 KOC 违约处理 | -15 |

## 新增组件

### `DeadlineBadge`

```
Props:
  - deadline: string (ISO timestamp)
  - label: string ("提交内容")
  - penalty: string ("逾期将扣除 15 信任分 + 没收 10pt 质押")
  - onExpired?: () => void

Display:
  🟢 > 7天: "还剩 12 天" — green
  🟡 3-7天: "还剩 5 天，请尽快提交" — amber + pulse
  🔴 < 3天: "仅剩 1 天！逾期将扣 15 信任分" — red + urgent pulse
  ⛔ 已逾期: "已逾期 2 天 · 质押已没收" — dark red

Size variants: sm (inline/card), md (detail page)
```

### `CommitmentConfirm`

```
Props:
  - title: string
  - commitments: {icon, text}[]
  - pledge: {amount, refund}[]
  - redlines: {trigger, penalty}[]
  - onConfirm: () => void
  - onCancel: () => void

Behavior:
  - "我已阅读并理解" checkbox → 必须勾选才能确认
  - 确认按钮初始 disabled
  - 不可点击遮罩关闭（强制阅读）
```

## 页面改造

### 1. KOC 任务详情 (`portal/tasks/[id]/page.tsx`)

**接单区（assigned 状态）：**
- 点击 "接单" → 弹出 `CommitmentConfirm`，列出：
  - 承诺：收到样品 14 天内提交内容
  - 质押：冻结 10pt，完成退 5pt
  - 红线：14天未提交 → 扣 15 信任分 + 没收质押
  - 限制：同时最多进行 5 个任务
  - 权益：商家 48h 不发货 → 退你质押 + 商家扣 20 分
- 勾选确认后才能点 "确认接单"

**提交区（received/creating/revision_requested 状态）：**
- 在提交表单上方放 `DeadlineBadge`（14 天倒计时 或 3 天重交倒计时）
- 剩余 < 3 天时，倒计时红色 + 文本框上方红色提示条

**已逾期状态（新增）：**
- 替换当前空白——slot status 为 `timed_out` 时显示红色卡片：
  ```
  ⛔ 该任务已逾期
  · 质押 10pt 已退还商家
  · 信任分 -15（XX → XX）
  · 当前等级：XX（可能已降级）
  ```
- 从 `revision_requested` 进入超限 → 同样显示违约结果

**状态时间线补充：**
- 当前时间线只显示了 5 个 step，缺少 `timed_out` / `revision_requested` / `approved`
- 每个 step 旁边加该阶段的截止时间

### 2. 商家任务详情 (`dashboard/tasks/[id]/page.tsx`)

**发货区（accepted 状态）：**
- 物流单号输入框上方加 `DeadlineBadge`（48h 倒计时）
- 逾期后显示红色提示："发货逾期！KOC 质押已退还，你的信任分 -20"

**审核区（submitted 状态，新增）：**
- 当前完全没有审核 UI，需要新增
- 每个 submitted 的 slot 显示：
  - KOC 提交的内容链接
  - `DeadlineBadge`（4 天审核倒计时）
  - [Approve] [Reject] 两个按钮
  - Reject 需要填理由
- 逾期自动通过后显示 "系统已自动通过（商家超时未审）"

**任务卡片（progress tab）：**
- `TaskProgress` 组件中每个 slot 加剩余时间

### 3. 商家发布任务 (`dashboard/tasks/new/page.tsx`)

**费用预估区下方新增 SLA 协议区：**
```
📋 发布前确认：

作为商家，你承诺：
☐ 48 小时内发货（逾期扣 20 信任分 + 退 KOC 质押）
☐ 4 天内审核 KOC 提交内容（逾期自动通过）
☐ 平台服务费 5pt 发布即扣，不可退
☐ 每 slot 质押 10pt，KOC 完成后退还

[我已阅读并同意以上规则] → 发布按钮才可点击
```

### 4. KOC 任务广场 (`portal/hall/page.tsx`) + TaskCard

**TaskCard 新增：**
- 如果 KOC 已接此任务，显示剩余提交天数角标（右上角）
- 逾期任务在列表中显示为灰色 + "已逾期" 标签

### 5. TaskProgress 组件

**每个 slot 行新增右侧倒计时：**
```
KOC-8A3F  [已接单]  ⏰ 还剩 38h 发货
KOC-2B7E  [已发货]  ⏰ 还剩 5d 收货
KOC-1C4D  [创作中]  ⏰ 还剩 12d 提交
KOC-9F2A  [已提交]  ⏰ 还剩 3d 审核
KOC-3E8B  [已逾期]  ⛔ 质押已没收
```

## 验证

1. KOC 接单流程：弹窗 → 勾选确认 → 接单成功
2. 倒计时显示：验证绿/黄/红颜色切换 + 脉冲动画
3. 逾期展示：手动设置已过期 slot → 确认红色卡片 + 损失明细
4. 商家发货倒计时：accepted → 48h 倒计时 → 逾期红色
5. 商家审核 UI：submitted slot → Approve/Reject + 4 天倒计时
6. 发布任务 SLA 协议：不勾选无法发布
7. 全量 E2E 测试通过
