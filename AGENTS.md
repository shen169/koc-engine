# AGENTS.md — KOC Engine

## Project

Cross-border e-commerce KOC bilateral matching platform V2.

**Core change (V1→V2):** From Admin manual matching → **auto-accept + Task Hall + pledge economy**.
- Merchants publish tasks (Urgent = auto-match / Long-term = enter Task Hall)
- KOCs browse and accept tasks in Task Hall, or express interest in products for auto-assignment
- Both sides deposit: merchant pre-pays commission pool (non-refundable), KOC puts 10pt pledge (9pt refunded on completion, 1pt platform fee)
- Commission paid in platform points: KOC receives commission + 9pt on merchant approval

Core rule: **Both sides cannot see each other's contact info**. The platform is the sole intermediary, managing all communication and fulfillment.

## Tech Stack

- Backend: Python 3.12 + FastAPI + uvicorn + httpx
- Frontend: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- AI: DeepSeek v4 (`deepseek-chat`, OpenAI-compatible API)
- Storage: JSON files + threading.Lock (`output/` directory, same pattern as TVS)
- Auth: bcrypt + PyJWT (3 roles: koc / merchant / admin)
- Fonts: Inter + JetBrains Mono (Google Fonts)

## Start

### Docker (Recommended)
```bash
cp backend/.env.example backend/.env   # then edit backend/.env
docker compose up -d --build
# Backend:  http://localhost/api/health
# Frontend: http://localhost
```

### Local dev (bare metal)
```bash
# Backend (MUST start from backend/ directory)
cd backend && source ../venv/bin/activate && uvicorn main:app --port 8001 --reload

# Frontend
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

## Deploy

### Docker Compose → VPS (推荐)

```bash
# 1. VPS 装 Docker
curl -fsSL https://get.docker.com | sudo bash

# 2. 克隆 + 配置
git clone https://github.com/shen169/koc-engine.git && cd koc-engine
cp backend/.env.example backend/.env
nano backend/.env   # 填 DEEPSEEK_API_KEY

# 3. 启动（4 容器：nginx + backend + frontend + certbot）
sudo docker compose up -d --build

# 4. DNS A 记录 → VPS IP，然后配 HTTPS
sudo ./ssl-init.sh your-domain.com
```

**架构：**
```
                      ┌─────────────────────────┐
                      │   nginx (80/443)         │
                      │   /api/* → backend:8001  │
                      │   /*     → frontend:3000 │
                      └─────────────────────────┘
                             ↑              ↑
                        FastAPI    Next.js (standalone)
                       (Python 3.12)  (Node 20)
                      ┌─────────────────────────┐
                      │  certbot (auto-renew)    │
                      └─────────────────────────┘
```

**管理：**
```bash
sudo docker compose ps          # 容器状态
sudo docker compose logs -f     # 所有日志
sudo docker compose restart     # 重启全部
sudo docker compose up -d --build   # 代码更新后重建
```

## Environment Variables

Backend `backend/.env`:

| Variable | Description | Required |
|------|------|:--:|
| `DEEPSEEK_API_KEY` | DeepSeek API Key (AI scoring + matching re-rank) | ✅ |
| `JWT_SECRET` | JWT signing key | ❌ (default dev key) |
| `ACCESS_PASSWORD` | Admin password | ❌ (default admin123) |

## Three Roles

| | KOC | Merchant | Admin |
|------|:--:|:--:|:--:|
| Register | ✅ auto-approve (AI scored) | ✅ open | system-created |
| Browse KOC Pool | ✗ | ✅ (anonymous) | ✅ |
| Browse Task Hall | ✅ | ✗ | ✅ |
| Browse Product Pool | ✅ | own only | ✅ |
| Publish Tasks | ✗ | ✅ (Trust ≥40) | ✅ |
| Accept Tasks | ✅ (max 5) | ✗ | ✅ |
| Express Interest | ✅ → auto-accept | ✅ on KOC | ✗ |
| View Contact Info | ✗ | ✗ | ✅ |
| Mutual Reviews | ✅ rate merchant | ✅ rate KOC | ✗ |
| Report | ✅ report merchant | ✗ | ✅ review reports |
| Blacklist | ✅ | ✅ | ✅ |

## Full Workflow (V2)

```
Merchant registers (5000pt) → creates profile → lists products (with commission link) → publishes task
    ├─ Urgent: auto-matching engine fills KOC slots → assigned
    └─ Long-term: creates empty slots → enters Task Hall for KOCs to browse and accept

KOC landing page → applies (strict validation + AI scoring) → auto-approved (1000pt) → browses Task Hall + Product Pool
    ├─ Task Hall accept: browse → accept → deduct pledge (10pt)
    └─ Product interest: auto-fills existing empty slots OR creates long_term task

Both sides pledge deducted → Merchant ships (tracking + carrier + proof photos) → Tracking (auto-query delivery → auto-receive) → KOC receives (with unboxing photos) → creates content → submits content links
    ↓ enters pending review status (no longer auto-completes!)
Merchant reviews KOC submission:
    ├─ approve → return both pledges + restore Trust Score (+3) + calibrate tier ✅
    ├─ reject → KOC revises and resubmits (max 3 times, exceeded → violation)
    └─ 4 days no review → cron auto-approves (protects KOC from malicious delays)
Commission: KOC receives (commission + 9pt) on merchant approval (from merchant's pre-paid commission pool; 1pt platform fee deducted from 10pt pledge)
Mutual reviews

Cron periodic scan (every hour; tracking every 24h):
├─ Timeout detection: accept 12h→redistribute | ship 48h→merchant violation (return KOC pledge + deduct merchant Trust) | submit 14d→KOC violation (return merchant pledge + deduct KOC Trust)
├─ Review timeout: submitted 4d no review→auto-approve | revision_requested 3d no resubmit→KOC violation
├─ Tracking: daily query all shipped slots → carrier confirms delivery → auto-mark received
├─ Long-term empty slots: 7 days unclaimed→system auto-match fills slots
└─ Trust Score linkage: complete/violate/report→Trust Score changes→tier auto-calibration (L1⇄L2⇄L3 / M1⇄M2⇄M3)
```

## Project Structure

```
koc-engine/
├── backend/
│   ├── main.py                # FastAPI entry + CORS + route registration + cron loop
│   ├── models.py              # All Pydantic models (12 entities + state machine constants)
│   ├── config.py              # Config/constants/points/pledge/fees/SLA (.env manual load)
│   ├── auth.py                # JWT auth + role dependencies (require_koc/merchant/admin)
│   ├── routes/                # 16 route modules
│   │   ├── auth_routes.py         # Register/login/me (returns Trust Score + tier + points)
│   │   ├── landing_routes.py      # Landing page data (public)
│   │   ├── application_routes.py  # KOC application + AI scoring + strict validation + auto-approve + referral
│   │   ├── koc_routes.py          # KOC profiles + anonymous pool (merchant view)
│   │   ├── merchant_routes.py     # Merchant profiles + trust lookup + report fake commission link
│   │   ├── product_routes.py      # Product CRUD + role views (KOC sees active + merchant info)
│   │   ├── interest_routes.py     # Interest expression → auto-accept (core flow)
│   │   ├── matching_routes.py     # Smart matching: find KOCs for product / find products for KOC / batch interest
│   │   ├── task_routes.py         # Tasks V2: publish/hall/accept/reject/ship/receive/submit/report/rematch
│   │   ├── credit_routes.py       # Credit balance/history/Admin reward
│   │   ├── coupon_routes.py       # Discount codes + CSV batch import orders
│   │   ├── referral_routes.py     # KOC referral codes/stats
│   │   ├── review_routes.py       # Mutual reviews (post-fulfillment)
│   │   ├── blacklist_routes.py    # Bidirectional blacklist
│   │   ├── scoring_routes.py      # AI scoring standalone call
│   │   └── admin_routes.py        # Stats/Cron/Report review/User list
│   ├── stores/                # JSON file storage layer (14 stores)
│   │   ├── user_store.py / koc_store.py / merchant_store.py
│   │   ├── product_store.py / task_store.py / application_store.py
│   │   ├── interest_store.py / credit_store.py / coupon_store.py
│   │   ├── referral_store.py / review_store.py / blacklist_store.py
│   │   └── report_store.py   # Report ticket storage
│   ├── services/
│   │   ├── scorer.py          # DeepSeek v4 3D scoring (mock fallback)
│   │   ├── matcher.py         # Matching engine: rule engine (7-dim weighted) + AI re-rank
│   │   ├── cron.py            # Periodic scan: timeout detection + auto-processing + Trust Score linkage + tier calibration
│   │   ├── tracking.py        # Shipment tracking: multi-carrier auto-query + delivery auto-receive
│   │   ├── email_service.py   # Email templates (placeholder)
│   │   └── tvs_client.py      # TVS integration placeholder (P2)
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Public landing (spark animation + tri-color gradient)
│   │   ├── koc/apply/page.tsx     # KOC application + AI scoring animation
│   │   ├── login/page.tsx / register/page.tsx
│   │   ├── portal/                # KOC Portal (warm orange background)
│   │   │   ├── page.tsx / products/ / products/[id]/
│   │   │   ├── hall/              # Task Hall (browse + filter + sort + accept)
│   │   │   ├── tasks/ / tasks/[id]/
│   │   │   ├── credits/ / coupons/ / referrals/
│   │   ├── dashboard/             # Merchant Dashboard (light purple background)
│   │   │   ├── page.tsx / products/ / products/new/ / koc-pool/
│   │   │   ├── tasks/ / tasks/new/ / tasks/[id]/
│   │   └── admin/                 # Admin Panel (neutral gray background)
│   │       ├── page.tsx / applications/ / koc/ / merchants/
│   │       ├── products/ / interests/ / tasks/ / credits/
│   ├── components/
│   │   ├── Spark.tsx              # Spark symbol (breathe + bounce-in + match particles)
│   │   ├── MatchModal.tsx         # Match success modal
│   │   ├── CoinDrop.tsx           # Credit arrival animation
│   │   ├── TaskCard.tsx           # Task card (hall/list reusable)
│   │   ├── TaskProgress.tsx       # Task status progress bar
│   │   ├── IntegrityBadge.tsx     # Trust badge (M1/M2/M3 + L1/L2/L3)
│   │   ├── DeadlineBadge.tsx      # SLA countdown timer (4-states: green/amber/red/expired)
│   │   ├── CommitmentConfirm.tsx  # Pre-action confirmation modal with mandatory checkbox
│   │   └── NavBar.tsx             # Global navigation bar
│   ├── lib/api.ts                 # API client (fetch wrapper + auth helpers)
│   └── middleware.ts              # Next.js route protection
├── output/                    # Runtime data (gitignored)
├── docs/superpowers/specs/    # Design specs
│   └── 2026-06-15-brand-brief.md
├── render.yaml                # Render deploy (Backend only)
└── AGENTS.md
```

## Key Design Decisions

1. **user_id ≠ koc_profile_id**: KOC registration (users table) and KOC profile (koc_profiles table) are two separate entities. Linked by: email. Task slots store the koc profile id; auth and credit issuance must bridge to user_id via email. `_get_koc_user_id()` in `task_routes.py` and `cron.py` handles this bridge.

2. **KOC Interest = Auto-Accept** (V2 core change): `POST /api/interests` → when a KOC expresses interest in a product, the system auto-finds an empty slot in that product's existing task and fills it; if no empty slot exists, it auto-creates a long_term task. **No longer waits for merchant response or Admin manual matching**. Merchant interest on a KOC is a signal only, does not trigger auto-action.

3. **Task Hall**: Core interface for KOCs to browse available tasks. `GET /api/tasks/hall` only shows tasks with open slots that the KOC hasn't already joined. Sort dimensions: urgency first (0.30) + recency (0.25) + commission (0.20) + merchant tier (0.15) + remaining slots (0.10). Supports category/type/commission/region filters.

4. **Urgent vs Long-term**: `task_type=urgent` → auto-triggers `match_kocs_for_task()` on publish to fill slots; `task_type=long_term` → creates empty slots for Task Hall, KOCs browse and accept independently, cron intervenes after 7 days if slots remain empty.

5. **Pledge Economy**:
   - Merchant per task publish: deduct **5pt** platform service fee (non-refundable) + **commission × koc_required** commission pool (non-refundable, paid to KOCs on completion)
   - KOC accept: deduct fixed **10pt** pledge. On completion: KOC gets **commission + 9pt** (10pt − 1pt platform fee). Commission pool is NOT refunded to merchant.
   - KOC breach: commission returned to merchant, KOC forfeits 10pt pledge. Merchant breach: KOC gets full 10pt pledge back.
   - AI content judgment: 1 revision allowed. Second merchant rejection → AI (DeepSeek v4) makes final binding decision.
   - Commission is paid in platform points (withdrawable). 1pt = $1 USD.

   - Repeat collaboration bonus: same merchant×KOC history → match score boost (+3 each time, max 15; avg rating ≥4.0 → extra +5)

6. **Bidirectional Trust Score + Tier Linkage**:
   - KOC: trust_score 0-100 → L1/L2/L3 (≥55 + 2 completed → L2, ≥75 + 5 completed + 4.0 avg rating → L3)
   - Merchant: trust_score 0-100 → M1/M2/M3 (≥55 + 3 completed → M2, ≥75 + 10 completed + 4.0 avg rating → M3)
   - Trust <40: merchant cannot publish new tasks; Trust <30: KOC excluded from matching
   - Complete fulfillment +3, Ghosted -20, Violation -15, Report upheld -30, Active rejection -3
   - Every Trust Score change → auto-calls sync_koc_tier/sync_merchant_tier to calibrate tier (can go up or down)

7. **SLA Timeout System** (cron scans every hour):
   | Stage | Deadline | Timeout Action |
   |------|------|---------|
   | KOC Accept | 12h | Auto-redistribute (no penalty) |
   | Merchant Ship | 48h | Violation: return KOC pledge + deduct merchant 20 Trust Score. Commission pool forfeited (not refunded) |
   | KOC Confirm Receipt | 7d | Auto-confirm receipt |
   | KOC Submit Content | 14d | Violation: return commission to merchant + forfeit KOC 10pt pledge + KOC Trust -15 |
   | Merchant Review Content | 3d | Auto-approve → KOC gets commission + 9pt, both Trust +3 |
   | KOC Revision Resubmit | 3d | Timeout → same as submit timeout (KOC violation) |
   | Long-term Empty Slot | 7d | System intervenes with auto-match |

   **AI Content Judgment**: 1 revision allowed. Second merchant rejection → DeepSeek v4 makes final binding decision (approve→force pay / reject→KOC violation).

8. **AI Scoring Fallback**: When DeepSeek API is unavailable, auto-falls back to mock scores (based on handle hash + follower count bonus), does not block application flow.

9. **Storage Pattern**: Each Store uses `threading.Lock() + JSON file`, modeled on tvs-video-tool's `FileTaskStore` pattern. No database dependency.

10. **Brand**: Vibrant social direction — Pink→Purple gradient, Inter font, pill buttons, spark symbol ✦, four role-specific background colors.

11. **Content Review Loop** (V2.1 addition): KOC submission no longer auto-completes; must pass merchant review:
    - `submit` → slot enters `submitted` status (pending review), pledge/Trust not yet released
    - Merchant `review` (approve) → slot `approved` → return pledge + restore Trust Score + calibrate tier
    - Merchant `review` (reject) → slot `revision_requested` → KOC revises and resubmits (max 3 times)
    - Exceeding revision limit → KOC violation (return merchant pledge + deduct KOC 15 Trust Score)
    - Merchant 4 days no review → cron auto-approves (prevents merchant malicious delay)
    - Shipment verification: merchant must provide `carrier` + `shipping_proof_urls` (receipt photos/screenshots)
    - Receipt verification: KOC can upload `receipt_photo_urls` (unboxing photos) + `receipt_notes`
    - Tracking automation: cron daily queries all shipped slots → carrier confirms delivery → auto-mark received. Supports FedEx/DHL/USPS/UPS/SF-Express and other major carriers, API query + web parsing dual-path fallback, result caching to avoid frequent requests

12. **Notification System** (V2.3): Three-channel notification for every lifecycle event:
    - **KOC**: In-app + Email
    - **Merchant**: In-app + Email + Feishu Webhook
    - **Admin**: In-app only

    | Event | KOC | Merchant | Trigger |
    |------|:--:|:--:|------|
    | Task accepted | — | ✅ | accept_task |
    | Task declined | — | ✅ | reject_task |
    | Sample shipped | ✅ | — | ship_task |
    | Receipt confirmed | — | ✅ | receive_task |
    | Content submitted | — | ✅ | submit_content |
    | Content approved | ✅ | — | review (approve) |
    | Revision requested | ✅ | — | review (reject 1st) |
    | AI overruled → approve | ✅ | ✅ | review (reject 2nd) |
    | AI rejected KOC | ✅ | ✅ | review (reject 2nd) |
    | Auto-approved (cron) | ✅ | ✅ | cron timeout |
    | Submit timeout (cron) | ✅ | ✅ | cron timeout |
    | Revision timeout (cron) | ✅ | ✅ | cron timeout |
    | Ship timeout (cron) | ✅ | ✅ | cron timeout |
    | Application approved | ✅ | — | application auto-approve |

    All notifications go through `notify_user()` in `services/notifier.py` — the single entry point. Cron handlers call it directly. Email templates in `services/email_service.py` updated to V2 economic model (1pt=$1, commission + 9pt return, SLA deadlines).

13. **Hook System** — All automated state transitions:
    - **Cron hooks** (7, every 1h): accept timeout / ship timeout / receive auto-confirm / submit timeout / review auto-approve / revision timeout / long-term idle rematch
    - **Event hooks** (7, in routes): task publish→auto-match / accept→deduct pledge / reject→rematch / ship→notify / interest→auto-accept / submit→pending review / review→approve|reject|AI judge
    - **Trust hooks** (2): every trust score change → `sync_koc_tier()` / `sync_merchant_tier()` auto-calibrates tier (bidirectional, can go up or down)
    - **Performance hook** (1): content metrics update → `_sync_koc_performance()` recalculates performance_score via log-scale normalization
    - **Tracking hook** (1): daily carrier query → auto-receive on delivery confirmation

14. **Red Line Warning System** (V2.2): SLA deadlines are surfaced to users at 3 touchpoints:
    - **Before action**: `CommitmentConfirm` modal with mandatory checkbox listing commitments, pledge rules, and penalty red lines
    - **During active task**: `DeadlineBadge` countdown timer with 4 states (green >7d, amber 3-7d with pulse, red <3d with pulse, dark red expired)
    - **After violation**: Timed-out state panel showing exact loss breakdown (pledge forfeited, Trust Score deduction, tier impact)

## API Endpoint Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/auth/register` | ✗ | Register (koc→1000pt, merchant→5000pt) |
| POST | `/api/auth/login` | ✗ | Login → JWT |
| GET | `/api/auth/me` | ✅ | User + role + points + Trust Score + tier |

### Landing (Public)
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| GET | `/api/landing/stats` | ✗ | Platform stats (KOC count/videos/products) |
| GET | `/api/landing/products` | ✗ | Active product showcase |

### KOC Applications
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/applications` | ✗ | KOC application → strict validation → AI scoring → auto-approved (grants credits + referral reward) |
| GET | `/api/applications` | 🔒 | Application list |
| GET | `/api/applications/{id}` | 🔒 | Application detail |
| PUT | `/api/applications/{id}/decision` | 🔒 | Manual override (rarely needed; normal flow is auto-approved) |

### KOC Profiles
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| GET | `/api/koc/pool` | ✅ | Merchant browses anonymous KOC pool (no contact info) |
| GET | `/api/koc/pool/{id}` | ✅ | Merchant views anonymous KOC detail |
| GET | `/api/koc` | 🔒 | Admin full list (with filtering) |
| GET | `/api/koc/{id}` | ✅ | KOC detail |
| PUT | `/api/koc/{id}` | 🔒 | Admin update KOC |

### Merchants
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/merchants` | ✅ | Create merchant profile |
| GET | `/api/merchants/me` | ✅ | My merchant profile |
| PUT | `/api/merchants/me` | ✅ | Update merchant profile |
| GET | `/api/merchants` | 🔒 | Admin full list |
| GET | `/api/merchants/{id}/trust` | ✅ | Merchant trust info (for KOC decision-making) |
| POST | `/api/admin/merchants/{id}/trust` | 🔒 | Admin adjust merchant Trust Score |
| POST | `/api/merchants/{id}/report-fake-link` | ✅ | KOC report invalid commission link |

### Products
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/products` | ✅ | Merchant lists product (with commission link) |
| GET | `/api/products` | ✅ | Product list (role-specific views, KOC view includes merchant info) |
| GET | `/api/products/{id}` | ✅ | Product detail |
| PUT | `/api/products/{id}` | ✅ | Update product (owner or admin) |

### Interest → Auto-Accept (V2 Core)
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/interests` | ✅ | Express interest: KOC on product→auto-accept, merchant on KOC→signal |
| GET | `/api/interests` | ✅ | My interest list |
| GET | `/api/interests/matches` | 🔒 | Admin view all bidirectional matches |
| PUT | `/api/interests/{id}/match` | 🔒 | Admin confirm match (V1 legacy, rarely needed in V2) |
| PUT | `/api/interests/{id}/decline` | 🔒 | Admin reject interest |

### Smart Matching
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/matching/product/{id}` | ✅ | Match top KOCs for product (rules + AI re-rank) |
| GET | `/api/matching/koc` | ✅ | Match top products for current KOC |
| GET | `/api/matching/koc/{id}` | 🔒 | Admin match products for specified KOC |
| POST | `/api/matching/auto-interest` | ✅ | Batch express interest (dedup) |

### Tasks V2 (Slot-level)
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/tasks` | ✅ | Merchant publish task (urgent auto-matches, deduct platform fee 5pt) |
| GET | `/api/tasks/hall` | ✅ | KOC Task Hall (filter + sort + merchant trust) |
| GET | `/api/tasks/mine` | ✅ | My tasks (KOC sees slots/merchant sees published/admin sees all) |
| GET | `/api/tasks/{id}` | ✅ | Task detail (enriched with product + merchant info) |
| PUT | `/api/tasks/{id}/accept/{slot}` | ✅ | KOC accept task → deduct pledge 10pt |
| PUT | `/api/tasks/{id}/reject/{slot}` | ✅ | KOC reject → deduct Trust Score 3 + auto-redistribute |
| PUT | `/api/tasks/{id}/ship` | ✅ | Merchant ship (tracking + carrier + proof + deduct pledge) |
| PUT | `/api/tasks/{id}/receive/{slot}` | ✅ | KOC confirm receipt (with unboxing photos + notes) |
| PUT | `/api/tasks/{id}/submit/{slot}` | ✅ | KOC submit content → enters pending review (does NOT auto-complete) |
| PUT | `/api/tasks/{id}/review/{slot}` | ✅ | Merchant review KOC content (approve→complete+confirm commission/reject→return for revision) |
| PUT | `/api/tasks/{id}/metrics/{slot}` | ✅ | KOC update content performance data (views/likes/comments/shares/conversions) |
| GET | `/api/tasks/{id}/performance` | ✅ | Merchant view content performance dashboard (summary + per-KOC detail) |
| GET | `/api/tasks/{id}/report` | ✅ | Merchant view task data report |
| POST | `/api/tasks/{id}/force-rematch/{slot}` | 🔒 | Admin force rematch slot |
| PUT | `/api/tasks/{id}/sample` | 🔒 | DEPRECATED: legacy sample_status compatibility |

### Credits
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| GET | `/api/credits/balance` | ✅ | My credit balance |
| GET | `/api/credits/history` | ✅ | Credit transaction history |
| POST | `/api/credits/reward` | 🔒 | Admin manual credit reward |

### Coupons
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/coupons` | 🔒 | Admin generate discount code |
| GET | `/api/coupons` | ✅ | My discount codes |
| GET | `/api/coupons/{id}/usage` | ✅ | Discount code usage stats |
| POST | `/api/coupons/{id}/orders` | 🔒 | Add order |
| POST | `/api/coupons/batch-import` | 🔒 | CSV batch import orders |

### Referrals
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| GET | `/api/referrals/code` | ✅ | Get my referral code/link |
| GET | `/api/referrals` | ✅ | My referral list |
| GET | `/api/referrals/stats` | ✅ | Referral stats |

### Reviews
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/reviews` | ✅ | Post-fulfillment mutual review (updates avg_rating) |
| GET | `/api/reviews` | ✅ | View reviews |

### Blacklist
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/blacklist` | ✅ | Block user |
| GET | `/api/blacklist` | ✅ | My blacklist |
| GET | `/api/blacklist/check` | 🔒 | Check if blocked |

### AI Scoring
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| POST | `/api/scoring/evaluate-application` | ✗ | 3D scoring (public) |
| POST | `/api/scoring/evaluate-profile` | 🔒 | Re-score existing KOC |

### Admin
| Method | Path | Auth | Description |
|--------|------|:--:|------|
| GET | `/api/admin/stats` | 🔒 | Dashboard stats |
| GET | `/api/admin/users` | 🔒 | All users (with balances) |
| POST | `/api/admin/cron/scan` | 🔒 | Manual trigger periodic scan |
| GET | `/api/admin/cron/alerts` | 🔒 | View overdue alerts |
| GET | `/api/admin/reports` | 🔒 | Report list |
| PUT | `/api/admin/reports/{id}/review` | 🔒 | Review report (approve→deduct 30 + downgrade) |

✅ = KOC/Merchant login required &nbsp; 🔒 = admin only

## Credit / Pledge / Fee Constants Quick Reference

| Constant | Value | Description |
|------|:--:|------|
| KOC Registration Initial | 1000pt (bonus) | Granted on registration, non-withdrawable |
| Merchant Registration Initial | 5000pt (bonus) | Granted on registration, non-withdrawable |
| Platform Service Fee | 5pt | Deducted from merchant per task publish (non-refundable) |
| KOC Platform Fee | 1pt | Deducted from KOC pledge per slot completion |
| KOC Fixed Pledge | 10pt | KOC pays on accept, 9pt returned on completion |
| Commission Pool | commission × koc_required | Merchant pre-pays at publish, non-refundable, paid to KOCs |
| Referral Reward | 10pt | Referrer receives (withdrawable) |
| PT to USD | 1pt = $1 | Exchange rate for withdrawal |

## Important Notes

- Backend MUST be started from `backend/` directory (`uvicorn main:app`), otherwise `from config import ...` and similar absolute imports will fail
- `backend/.env` is manually loaded by config.py (no python-dotenv), only supports `KEY=VALUE` format
- KOC user_id (users table) ≠ koc_id (koc_profiles table); task slots store koc_id; auth/credit issuance must bridge via email
- Frontend API calls directly connect to `http://localhost:8001` (`NEXT_PUBLIC_API_URL` env var), no Next.js proxy
- Tailwind v4 uses CSS-based `@theme` config, NOT `tailwind.config.ts`
- Spark particle animation uses CSS custom properties (`--tx` / `--ty`) for directional control
- `cron.py`'s `calculate_tier` / `sync_koc_tier` / `sync_merchant_tier` are the core Trust Score→tier calibration functions; any operation that modifies Trust Score MUST call them
- KOC concurrent active task limit = **5 active slots** (enforced in both accept_task and express_interest)
- Commission is paid in platform points: KOC receives `commission + 9pt` on merchant approval (from pre-paid commission pool + pledge return minus 1pt fee). The `commission` field on KocTask determines per-KOC payout. Product's `commission_link` is the product page URL for KOC to promote
- Matching engine `matcher.py` has two layers: rule engine (7-dim weighted) always available → AI re-rank optional (use_ai=true). Task publish auto-matching only uses rule engine
- **JSON storage thread safety**: Stores use `threading.Lock()` to prevent race conditions, but this is only effective for single-process. Multi-uvicorn-worker deployments have cross-process race condition risk for slot accept operations. Production recommendation: single worker (`--workers 1`) or migrate to database
- Frontend is fully English (i18n completed June 2026): all UI labels, error messages, commitment modals, SLA warnings, status badges, and navigation items are in English. Use canonical translations: `pt` (not "points"), `Trust Score`, `Pledge`, `Commission`, `Urgent`/`Long-term`, `Task Hall`, tier labels `Partner`/`Creator`/`Explorer` and `Gold`/`Silver`/`Bronze Merchant`
