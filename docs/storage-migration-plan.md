# KOC Engine 存储迁移方案：JSON → SQLite

> 状态：草案 | 目标：生产就绪前执行 | 当前：JSON + threading.Lock（MVP 阶段不迁移）

## 一、为什么迁

| 当前问题 | SQLite 解决方式 |
|------|------|
| `threading.Lock()` 只保护单进程，多 worker 有竞态 | SQLite 有真正的 ACID 写事务 + WAL 模式并发读 |
| 全量读写 JSON（每个操作 = 读全文件 + 写全文件） | 按主键点查/索引查询，只读写涉及的页面 |
| 桥接查询 O(n) 全表扫描（如 `list_by_koc`） | `CREATE INDEX idx_koc_slots_koc_id ON ...` |
| 无 schema versioning，手动内联迁移 | SQLite `PRAGMA user_version` + 版本化迁移脚本 |
| 积分余额和流水可能不一致 | 事务内原子写入，不会出现扣款流水写了但余额没更新的情况 |

## 二、为什么是 SQLite 而不是 PostgreSQL

- **零运维**：一个文件，和现在的 `output/` 目录一样简单
- **单 VPS 部署完全够用**：SQLite 在单机场景下吞吐量可达百万级
- **WAL 模式支持并发读**：读不阻塞写，写不阻塞读
- **不需要 Docker/服务进程**：`pip install aiosqlite` 即可
- **迁移成本低**：数据模型已经足够结构化，JSON→SQL 是 1:1 映射
- **未来可升迁**：如果有一天需要多实例 → Litestream 实时备份到 S3，或迁到 PostgreSQL

## 三、目标 Schema

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- 用户
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('koc','merchant','admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- KOC 档案
CREATE TABLE koc_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    profile_url TEXT DEFAULT '',
    follower_count INTEGER DEFAULT 0,
    avg_likes INTEGER DEFAULT 0,
    region TEXT DEFAULT '',
    niche_tags TEXT DEFAULT '[]',          -- JSON array
    score_authenticity INTEGER DEFAULT 0,
    score_niche INTEGER DEFAULT 0,
    score_engagement INTEGER DEFAULT 0,
    score_total INTEGER DEFAULT 0,
    score_reason TEXT DEFAULT '',
    tier TEXT DEFAULT 'L1',
    trust_score INTEGER DEFAULT 100,
    avg_rating REAL DEFAULT 0.0,
    total_collaborations INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    performance_score REAL DEFAULT 0.0,
    total_engagement INTEGER DEFAULT 0,
    total_content_posts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Applied',
    is_blacklisted INTEGER DEFAULT 0,
    source_engine TEXT DEFAULT 'inbound',
    discovered_at TEXT NOT NULL,
    last_scanned_at TEXT NOT NULL
);
CREATE INDEX idx_koc_email ON koc_profiles(email);
CREATE INDEX idx_koc_handle ON koc_profiles(platform, handle);
CREATE INDEX idx_koc_status ON koc_profiles(status);
CREATE INDEX idx_koc_tier ON koc_profiles(tier);
CREATE INDEX idx_koc_trust ON koc_profiles(trust_score);

-- 商家档案
CREATE TABLE merchants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    company_name TEXT DEFAULT '',
    website TEXT DEFAULT '',
    product_categories TEXT DEFAULT '[]',
    target_markets TEXT DEFAULT '[]',
    avg_rating REAL DEFAULT 0.0,
    total_collaborations INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_tasks_disputed INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 100,
    tier TEXT DEFAULT 'M1',
    is_blacklisted INTEGER DEFAULT 0,
    lark_webhook_url TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_merchant_user ON merchants(user_id);

-- 产品
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    asin TEXT DEFAULT '',
    product_id TEXT DEFAULT '',
    sales_platform TEXT DEFAULT '',
    name TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    category TEXT DEFAULT '',
    commission_type TEXT DEFAULT 'discount_code',
    commission_value TEXT DEFAULT '',
    commission_link TEXT DEFAULT '',
    description TEXT DEFAULT '',
    target_market TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_product_merchant ON products(merchant_id);
CREATE INDEX idx_product_status ON products(status);
CREATE INDEX idx_product_market ON products(target_market);

-- 任务
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    product_id TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    task_type TEXT DEFAULT 'long_term',
    task_status TEXT DEFAULT 'pending',
    koc_required INTEGER DEFAULT 1,
    commission INTEGER DEFAULT 0,
    pledge_merchant INTEGER DEFAULT 0,
    pledge_koc INTEGER DEFAULT 0,
    tracking_number TEXT DEFAULT '',
    carrier TEXT DEFAULT '',
    shipping_proof_urls TEXT DEFAULT '[]',
    content_urls TEXT DEFAULT '[]',
    due_at TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_task_merchant ON tasks(merchant_id);
CREATE INDEX idx_task_status ON tasks(task_status);
CREATE INDEX idx_task_product ON tasks(product_id);
CREATE INDEX idx_task_type ON tasks(task_type);

-- 任务 Slot（从 koc_slots JSON array 拆成独立表）
CREATE TABLE task_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    slot_index INTEGER NOT NULL,
    koc_id TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    assigned_at TEXT DEFAULT '',
    accepted_at TEXT DEFAULT '',
    shipped_at TEXT DEFAULT '',
    received_at TEXT DEFAULT '',
    submitted_at TEXT DEFAULT '',
    reviewed_at TEXT DEFAULT '',
    tracking_number TEXT DEFAULT '',
    carrier TEXT DEFAULT '',
    shipping_proof_urls TEXT DEFAULT '[]',
    receipt_photo_urls TEXT DEFAULT '[]',
    receipt_notes TEXT DEFAULT '',
    content_urls TEXT DEFAULT '[]',
    content_data TEXT DEFAULT '{}',
    pledge_paid INTEGER DEFAULT 0,
    commission_paid INTEGER DEFAULT 0,
    reject_count INTEGER DEFAULT 0,
    revision_count INTEGER DEFAULT 0,
    review_feedback TEXT DEFAULT '',
    warned_stages TEXT DEFAULT '[]',
    match_score REAL DEFAULT 0,
    UNIQUE(task_id, slot_index)
);
CREATE INDEX idx_slot_task ON task_slots(task_id);
CREATE INDEX idx_slot_koc ON task_slots(koc_id);
CREATE INDEX idx_slot_status ON task_slots(status);

-- 积分余额
CREATE TABLE credit_balances (
    user_id TEXT PRIMARY KEY,
    total INTEGER DEFAULT 0,
    withdrawable INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0
);

-- 积分流水
CREATE TABLE credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    ref_id TEXT DEFAULT '',
    note TEXT DEFAULT '',
    withdrawable INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_credit_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_type ON credit_transactions(type);

-- 意向
CREATE TABLE interests (
    id TEXT PRIMARY KEY,
    from_role TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    to_type TEXT NOT NULL,
    status TEXT DEFAULT 'expressed',
    matched_by TEXT DEFAULT '',
    matched_at TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_interest_from ON interests(from_id, from_role);
CREATE INDEX idx_interest_to ON interests(to_id, to_type);

-- 评价
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    dimensions TEXT DEFAULT '{}',
    comment TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_review_target ON reviews(target_id);
CREATE INDEX idx_review_task ON reviews(task_id);

-- 通知
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT '',
    title TEXT DEFAULT '',
    message TEXT DEFAULT '',
    task_id TEXT DEFAULT '',
    resource_path TEXT DEFAULT '',
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notif_user ON notifications(user_id, read);
CREATE INDEX idx_notif_created ON notifications(created_at);

-- 黑名单
CREATE TABLE blacklist (
    id TEXT PRIMARY KEY,
    created_by_role TEXT NOT NULL,
    created_by_id TEXT NOT NULL,
    target_role TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_blacklist_pair ON blacklist(created_by_id, target_id);

-- 其余表（applications, coupons, referrals, reports, withdrawals）结构简单，省略，同理映射
```

## 四、渐进式迁移步骤

### Phase 1：双写（0 风险，1 天）

```
┌─────────────┐     write      ┌──────────┐
│  FastAPI     │──────────────→│ JSON 文件 │  ← 现有，保持
│  Routes      │               └──────────┘
│              │     write      ┌──────────┐
│              │──────────────→│ SQLite   │  ← 新增
└─────────────┘               └──────────┘
```

- 新增 `stores/sqlite_store.py`，封装所有 SQL 操作
- 每个 Store 方法同时写 JSON 和 SQLite
- 读仍从 JSON 读
- 跑一周确认 SQLite 数据和 JSON 一致

### Phase 2：切读（1 天）

- 读切换到 SQLite
- JSON 保留为备份，只写不读
- 跑一周确认无回归

### Phase 3：停 JSON（5 分钟）

- 删除 JSON 写入逻辑
- 保留 JSON 文件作为归档
- 可选：`sqlite3 output/koc.db .dump > backup.sql`

## 五、关键收益

### 1. Slot accept 竞态彻底解决

```python
# 现在：两个 KOC 同时抢同一 slot
# worker-1: lock.acquire() → 读到 slot 空 → 写入 → lock.release()
# worker-2: lock.acquire() → 读到 slot 空 → 写入 → lock.release()
# ↑ 不同进程，两个 lock 各自持有，都以为成功了

# SQLite 后：
# BEGIN IMMEDIATE;
# UPDATE task_slots SET koc_id=?, status='accepted'
# WHERE task_id=? AND slot_index=? AND koc_id='' AND status='assigned';
# COMMIT;
# ↑ 第二个 UPDATE 返回 0 rows affected → 返回 409 Conflict
```

### 2. KOC 我的任务查询从 O(n²) → O(log n)

```python
# 现在：list_by_koc 遍历所有 task × 所有 slot
# SQLite 后：
# SELECT t.*, s.* FROM task_slots s
# JOIN tasks t ON t.id = s.task_id
# WHERE s.koc_id = ?
# ORDER BY s.accepted_at DESC
```

### 3. 积分对账可验证

```sql
-- 余额应该等于所有流水的 SUM
SELECT user_id, balance_total, tx_sum, balance_total - tx_sum AS diff
FROM (
    SELECT b.user_id, b.total AS balance_total,
           COALESCE(SUM(t.amount), 0) AS tx_sum
    FROM credit_balances b
    LEFT JOIN credit_transactions t ON t.user_id = b.user_id
    GROUP BY b.user_id
) WHERE balance_total != tx_sum;
```

## 六、何时执行

| 触发条件 | 当前 | 建议 |
|------|------|------|
| 用户 >50 | 18 | Phase 1（双写） |
| 用户 >200 | — | Phase 2（切读） |
| 多 worker 部署 | 1 worker | Phase 1 同时上线 |
| 第一个外部品牌入驻 | — | Phase 3（全切） |

当前建议：**不执行。等到用户数突破 50 或决定开多 worker 时，从 Phase 1 开始。**
