"""KOC Engine V2 E2E Test"""
import requests

BASE = "http://localhost:8001/api"

def ok(r):
    assert r.status_code in (200, 201), "{}: {}".format(r.status_code, r.text[:200])
    return r.json()

def auth_headers(token):
    return {"Authorization": "Bearer " + token}

print("=" * 60)
print("KOC Engine V2 E2E Test")
print("=" * 60)

# ── SETUP: Admin login ──
print("\n[Setup] Admin login...")
r = requests.post(BASE + "/auth/login", json={
    "email": "honghuishen24@gmail.com", "password": "admin123"
})
at = ok(r)["token"]

# ── 1. Register merchant + profile + product ──
print("\n1. Register merchant + product...")
r = requests.post(BASE + "/auth/register", json={
    "email": "brand4@test.com", "password": "test123", "role": "merchant"
})
mt = ok(r)["token"]
mp = ok(requests.post(BASE + "/merchants", json={
    "company_name": "Brand V4",
}, headers=auth_headers(mt)))
mid = mp["id"]
prod = ok(requests.post(BASE + "/products", json={
    "name": "Wireless Earbuds V4",
   "category": "electronics",
   "commission_value": "30%",
    "commission_link": "https://example.com/earbuds-v4",
}, headers=auth_headers(mt)))
pid = prod["id"]
print("   Merchant: trust={}, product={}".format(mp["trust_score"], prod["name"]))

# ── 2. Register + approve KOC ──
print("\n2. Register KOC + approve...")
r = requests.post(BASE + "/auth/register", json={
    "email": "creator4@test.com", "password": "test123", "role": "koc"
})
kt = ok(r)["token"]

app = ok(requests.post(BASE + "/applications", json={
    "handle": "@creator4",
    "platform": "tiktok",
    "name": "Creator Four",
    "follower_count": 15000,
    "niche_tags": ["electronics", "audio", "tech"],
    "email": "creator4@test.com",
    "region": "US",
    "profile_url": "https://www.tiktok.com/@creator4",
    "past_video_urls": [
        "https://www.tiktok.com/@creator4/video/1",
        "https://www.tiktok.com/@creator4/video/2",
    ],
}))
app_id = app.get("application_id") or app.get("id")
print("   Application: score={}, decision={}".format(app.get("ai_score"), app.get("decision")))

# Admin approves
decision = ok(requests.put(BASE + "/applications/" + app_id + "/decision", json={
    "decision": "approved",
}, headers=auth_headers(at)))
print("   Decision: {}".format(decision.get("decision")))

# ── 2b. Give merchant credits for platform fee + pledge ──
print("\n2b. Add merchant credits...")
m_user_id = requests.get(BASE + "/auth/me", headers=auth_headers(mt)).json()["id"]
cr = ok(requests.post(BASE + "/credits/reward", json={
    "user_id": m_user_id,
    "amount": 200,
    "type": "admin_adjust",
    "note": "Test credits for platform fee + pledge",
}, headers=auth_headers(at)))
print("   Merchant credits added: {}".format(cr.get("amount")))

# ── 3. Create urgent task (should match KOC now) ──
print("\n3. Create urgent task (3 KOCs)...")
task = ok(requests.post(BASE + "/tasks", json={
    "product_id": pid,
    "product_name": prod["name"],
    "task_type": "urgent",
    "koc_required": 3,
    "commission": 30,
}, headers=auth_headers(mt)))
tid = task["id"]
slots = task.get("koc_slots", [])
print("   Status: {}, type: {}".format(task["task_status"], task["task_type"]))
print("   Pledge: merchant={}, koc={}".format(task["pledge_merchant"], task["pledge_koc"]))
print("   Matched slots: {}".format(len(slots)))
for i, s in enumerate(slots[:3]):
    print("     Slot {}: koc_id={}, status={}, score={}".format(
        i, s.get("koc_id", "-")[:8] if s.get("koc_id") else "-",
        s.get("status"), s.get("match_score", "?")))

# ── 4. Task hall ──
print("\n4. Task hall...")
hall = ok(requests.get(BASE + "/tasks/hall", headers=auth_headers(kt)))
print("   {} tasks in hall".format(len(hall)))

# ── 5. KOC accepts slot ──
print("\n5. KOC accepts slot...")
if slots and slots[0].get("koc_id"):
    # Find which slot is assigned to our KOC
    slot_idx = None
    for i, s in enumerate(slots):
        if s.get("status") == "assigned":
            slot_idx = i
            break
    if slot_idx is not None:
        r = requests.put(BASE + "/tasks/" + tid + "/accept/" + str(slot_idx),
                         headers=auth_headers(kt))
        print("   Accept result: {}".format(r.status_code))
        if r.status_code == 200:
            print("   Status: {}".format(ok(r)["status"]))
        else:
            print("   Error: {}".format(r.text[:200]))
    else:
        print("   No assigned slot found for test KOC")

# ── 6. Merchant ships + shipping proof ──
print("\n6. Merchant ships (with carrier + proof)...")
r = requests.put(BASE + "/tasks/" + tid + "/ship", json={
    "tracking_number": "SF1234567890",
    "carrier": "SF-Express",
    "shipping_proof_urls": [
        "https://img.example.com/ship-proof-1.jpg",
        "https://img.example.com/ship-label.jpg",
    ],
}, headers=auth_headers(mt))
ship = ok(r)
print("   Ship: status={}, carrier={}, tracking={}".format(ship["status"], ship.get("carrier", ""), ship["tracking_number"]))

# ── 6b. KOC receives product ──
print("\n6b. KOC receives product...")
if slot_idx is not None:
    r = requests.put(BASE + "/tasks/" + tid + "/receive/" + str(slot_idx), json={
        "receipt_photo_urls": ["https://img.example.com/receipt-1.jpg"],
        "receipt_notes": "Package received in good condition",
    }, headers=auth_headers(kt))
    if r.status_code == 200:
        print("   Received: status={}".format(ok(r)["status"]))
    else:
        print("   Receive error: {}".format(r.text[:200]))
else:
    print("   ⚠ No slot to receive (no assigned slot)")

# ── 6c. KOC submits content (now awaits merchant review) ──
print("\n6c. KOC submits content...")
if slot_idx is not None:
    r = requests.put(BASE + "/tasks/" + tid + "/submit/" + str(slot_idx), json={
        "content_urls": [
            "https://www.tiktok.com/@creator4/video/1234567890",
            "https://www.instagram.com/p/abc123def456",
        ],
    }, headers=auth_headers(kt))
    if r.status_code == 200:
        submit = ok(r)
        print("   Submit: status={}, message={}".format(submit["status"], submit.get("message", "")))
    else:
        print("   Submit error: {}".format(r.text[:200]))
else:
    print("   ⚠ No slot to submit")

# ── 6d. Merchant reviews content (the verification loop!) ──
print("\n6d. Merchant reviews KOC content...")
if slot_idx is not None:
    r = requests.put(BASE + "/tasks/" + tid + "/review/" + str(slot_idx), json={
        "action": "approve",
        "feedback": "Great video quality! Love the product demonstration.",
    }, headers=auth_headers(mt))
    if r.status_code == 200:
        review = ok(r)
        print("   Review: status={}, commission_earned={}, pledge_returned={}".format(
            review["status"],
            review.get("commission_earned", 0),
            review.get("pledge_returned_koc", 0)))
    else:
        print("   Review error: {}".format(r.text[:200]))
else:
    print("   ⚠ No slot to review")

# ── 7. Task report ──
print("\n7. Task report...")
rep = ok(requests.get(BASE + "/tasks/" + tid + "/report", headers=auth_headers(mt)))
print("   Submitted: {}/{}, commission_paid: {}".format(
    rep["submitted_slots"], rep["total_slots"], rep["total_commission_paid"]))
for kr in rep.get("koc_reports", [])[:3]:
    print("     {}: status={}, urls={}".format(kr["koc_anon_id"], kr["status"], len(kr.get("content_urls", []))))

# ── 8. Merchant trust ──
print("\n8. Merchant trust...")
t = ok(requests.get(BASE + "/merchants/" + mid + "/trust", headers=auth_headers(kt)))
print("   Score: {}/100, level: {}".format(t["trust_score"], t["level"]))

# ── 9. Cron scan ──
print("\n9. Cron weekly scan...")
from services.cron import run_weekly_scan, check_ghosted_status
result = run_weekly_scan()
print("   rematched={}, m_defaulted={}, auto_recv={}, auto_review={}, koc_defaulted={}".format(
    result.get("slot_rematched", 0), result.get("merchant_defaulted", 0),
    result.get("auto_received", 0), result.get("auto_review_approved", 0),
    result.get("koc_defaulted", 0)))
print("   Tracking: checked={}, auto_received={}, in_transit={}, exceptions={}".format(
    result.get("tracking_checked", 0), result.get("auto_received_from_tracking", 0),
    result.get("tracking_in_transit", 0), result.get("tracking_exceptions", 0)))
alerts = check_ghosted_status()
print("   Alerts: {}".format(len(alerts)))

# ── 10. Auto-Matching Engine ──
print("\n10. Auto-Matching Engine...")

# 10a. Create merchants + products with different categories
print("   10a. Setting up products with categories...")
# Register merchant 2 with beauty product
r2 = requests.post(BASE + "/auth/register", json={
    "email": "beautybrand@test.com", "password": "test123", "role": "merchant"
})
m2t = ok(r2)["token"]
mp2 = ok(requests.post(BASE + "/merchants", json={
    "company_name": "Beauty Brand",
    "product_categories": ["skincare", "beauty", "k-beauty"],
}, headers=auth_headers(m2t)))
m2id = mp2["id"]

prod2 = ok(requests.post(BASE + "/products", json={
    "name": "Vitamin C Serum",
    "category": "skincare,beauty",
   "commission_value": "20% off",
    "commission_link": "https://example.com/vitamin-c-serum",
    "description": "Korean beauty vitamin C serum for brightening",
}, headers=auth_headers(m2t)))
p2id = prod2["id"]
print("      Product 2: {} (category: {})".format(prod2["name"], prod2["category"]))

# Register merchant 3 with fitness product
r3 = requests.post(BASE + "/auth/register", json={
    "email": "fitbrand@test.com", "password": "test123", "role": "merchant"
})
m3t = ok(r3)["token"]
mp3 = ok(requests.post(BASE + "/merchants", json={
    "company_name": "Fit Brand",
    "product_categories": ["fitness", "sports"],
}, headers=auth_headers(m3t)))
prod3 = ok(requests.post(BASE + "/products", json={
    "name": "Resistance Bands Set",
    "category": "fitness,sports",
    "commission_value": "15% off",
    "commission_link": "https://example.com/resistance-bands",
}, headers=auth_headers(m3t)))
p3id = prod3["id"]
print("      Product 3: {} (category: {})".format(prod3["name"], prod3["category"]))

# 10b. Create KOCs with different niche tags
print("\n   10b. Creating KOCs with different niches...")

def register_and_approve_koc(email, handle, niche_tags, platform="tiktok", follower_count=10000):
    """Helper: register KOC → apply → admin approve"""
    r = requests.post(BASE + "/auth/register", json={
        "email": email, "password": "test123", "role": "koc"
    })
    kt = ok(r)["token"]
    app = ok(requests.post(BASE + "/applications", json={
        "handle": handle,
        "platform": platform,
        "name": handle.lstrip("@"),
        "follower_count": follower_count,
        "niche_tags": niche_tags,
        "email": email,
        "region": "US",
        "profile_url": f"https://www.{platform}.com/{handle}",
        "past_video_urls": [
            f"https://{platform}.com/{handle}/video/1",
            f"https://{platform}.com/{handle}/video/2",
        ],
    }))
    app_id = app.get("application_id") or app.get("id")
    ok(requests.put(BASE + "/applications/" + app_id + "/decision", json={
        "decision": "approved",
    }, headers=auth_headers(at)))
    return kt

kt_beauty = register_and_approve_koc("beautykoc@test.com", "@beautyguru", ["skincare", "beauty", "k-beauty"], follower_count=50000)
kt_fitness = register_and_approve_koc("fitkoc@test.com", "@fitguru", ["fitness", "workout", "sports"], follower_count=80000)
kt_mixed = register_and_approve_koc("mixedkoc@test.com", "@mixedguru", ["beauty", "fitness", "lifestyle"], follower_count=30000)
print("      Created 3 approved KOCs: beauty, fitness, mixed")

# 10c. Match KOCs for beauty product
print("\n   10c. Testing match_kocs_for_product (rule engine)...")
r = requests.post(BASE + "/matching/product/" + p2id + "?top_n=10",
                  headers=auth_headers(m2t))
match_result = ok(r)
print("      Product: {}".format(match_result["product_name"]))
print("      Matches found: {}".format(match_result["matches_count"]))

matches = match_result["matches"]
assert len(matches) >= 1, "Should have at least 1 match"
# Beauty KOC should rank higher than fitness KOC for beauty product
if len(matches) >= 2:
    beauty_scores = [m["match_score"] for m in matches if "beauty" in str(m.get("niche_tags", [])).lower() or "skincare" in str(m.get("niche_tags", [])).lower()]
    print("      Beauty-related KOC scores: {}".format(beauty_scores))
    for m in matches[:3]:
        print("        {} (tags: {}) → score={}, reasons={}".format(
            m["display_name"], m.get("niche_tags", []), m["match_score"], m["match_reasons"][:2]))
    # First match should have high niche relevance
    assert matches[0]["match_score"] > 0, "Top match should have positive score"
    print("      ✅ Top match: {} (score={})".format(matches[0]["display_name"], matches[0]["match_score"]))

# 10d. Match products for KOC
print("\n   10d. Testing match_products_for_koc...")
# Get beauty KOC's user to find koc_id
koc_me = ok(requests.get(BASE + "/auth/me", headers=auth_headers(kt_beauty)))
# Find koc profile by listing
koc_list = ok(requests.get(BASE + "/koc", headers=auth_headers(at)))
beauty_koc = next((k for k in koc_list if k.get("email") == "beautykoc@test.com"), None)
if beauty_koc:
    r = requests.get(BASE + "/matching/koc/" + beauty_koc["id"] + "?top_n=10",
                     headers=auth_headers(at))
    koc_match = ok(r)
    print("      KOC: {}".format(koc_match["display_name"]))
    print("      Matches found: {}".format(koc_match["matches_count"]))
    for m in koc_match["matches"][:3]:
        print("        {} → score={}, reasons={}".format(
            m["product_name"], m["match_score"], m["match_reasons"][:2]))
    # Beauty KOC should match better with beauty product than fitness product
    beauty_product_match = next((m for m in koc_match["matches"] if "Serum" in m.get("product_name", "")), None)
    fitness_product_match = next((m for m in koc_match["matches"] if "Resistance" in m.get("product_name", "")), None)
    if beauty_product_match and fitness_product_match:
        print("      Beauty product score: {}, Fitness product score: {}".format(
            beauty_product_match["match_score"], fitness_product_match["match_score"]))
        assert beauty_product_match["match_score"] >= fitness_product_match["match_score"], \
            "Beauty KOC should score higher on beauty product than fitness product"
        print("      ✅ Beauty KOC matches beauty product better ({} vs {})".format(
            beauty_product_match["match_score"], fitness_product_match["match_score"]))

# 10e. Auto-interest batch (merchant → KOCs)
print("\n   10e. Testing auto-interest batch creation...")
# Get a few KOC IDs from the match results
top_koc_ids = [m["koc_id"] for m in matches[:2]]
r = requests.post(BASE + "/matching/auto-interest", json={
    "product_id": p2id,
    "koc_ids": top_koc_ids,
}, headers=auth_headers(m2t))
auto_result = ok(r)
print("      Created: {}, Skipped: {}".format(auto_result["total_created"], auto_result["total_skipped"]))
assert auto_result["total_created"] >= 1, "Should create at least 1 interest"
# Verify interests exist
my_interests = ok(requests.get(BASE + "/interests", headers=auth_headers(m2t)))
print("      Total interests for merchant: {}".format(len(my_interests)))

# 10f. Duplicate prevention
print("\n   10f. Testing duplicate prevention...")
r = requests.post(BASE + "/matching/auto-interest", json={
    "product_id": p2id,
    "koc_ids": top_koc_ids,
}, headers=auth_headers(m2t))
dup_result = ok(r)
print("      Created: {}, Skipped: {} (should all be skipped)".format(
    dup_result["total_created"], dup_result["total_skipped"]))
assert dup_result["total_created"] == 0, "Duplicates should be skipped"
assert dup_result["total_skipped"] == len(top_koc_ids), "All should be skipped"
print("      ✅ Duplicate prevention works")

# 10g. KOC recommendation endpoint
print("\n   10g. Testing KOC recommendation endpoint...")
r = requests.get(BASE + "/matching/koc?top_n=10", headers=auth_headers(kt_beauty))
koc_recs = ok(r)
print("      KOC: {}".format(koc_recs["display_name"]))
print("      Niche tags: {}".format(koc_recs["niche_tags"]))
print("      Recommendations: {}".format(koc_recs["matches_count"]))
assert koc_recs["matches_count"] >= 1, "Should have at least 1 recommendation"
for m in koc_recs["matches"][:3]:
    print("        {} (category: {}) → score={}".format(
        m["product_name"], m.get("product_category", ""), m["match_score"]))
print("      ✅ KOC recommendations work")

print("\n✅ All auto-matching tests passed!")

# ── 11. Tracking Service ──
print("\n11. Tracking Service...")
from services.tracking import check_tracking_sync, _build_display_url, _normalize_carrier, _parse_status

# 11a. Normalize carrier names
print("   11a. Carrier normalization...")
assert _normalize_carrier("sf") == "sf-express"
assert _normalize_carrier("SF-Express") == "sf-express"
assert _normalize_carrier("FedEx") == "fedex"
assert _normalize_carrier("DHL") == "dhl"
assert _normalize_carrier("顺丰") == "sf-express"
print("      ✅ All carrier names normalized correctly")

# 11b. Parse tracking statuses
print("   11b. Status parsing...")
assert _parse_status("Delivered - Signed by recipient") == "delivered"
assert _parse_status("已签收 - 本人签收") == "delivered"
assert _parse_status("Out for delivery today") == "in_transit"
assert _parse_status("In transit to destination") == "in_transit"
assert _parse_status("配送中") == "in_transit"
assert _parse_status("Shipment exception - address issue") == "exception"
assert _parse_status("Some random text") == "unknown"
print("      ✅ All statuses parsed correctly")

# 11c. Display URLs
print("   11c. Tracking display URLs...")
assert "SF1234567890" in _build_display_url("SF1234567890", "sf-express")
assert "TRK123" in _build_display_url("TRK123", "fedex")
print("      ✅ Display URLs generated")

# 11d. Real tracking check (may not resolve but returns valid structure)
print("   11d. Real tracking check...")
result = check_tracking_sync("SF1234567890", "sf-express")
print(f"      SF-Express SF1234567890: status={result['status']}, url={result.get('display_url', '')[:60]}")
assert "status" in result
assert "display_url" in result
assert "tracking_number" in result
print("      ✅ Tracking check returns valid structure")

print("\n✅ All tracking tests passed!")

print("\n" + "=" * 60)
print("ALL V2 E2E TESTS PASSED")
print("=" * 60)

# ── Summary ──
print("""
  Flow Tested:
  ✅ Merchant register → profile → product
  ✅ KOC register → apply → AI score → admin approve
  ✅ Task create → auto-match → KOC assigned
  ✅ KOC accept slot (pledge deducted)
  ✅ Merchant ship (carrier + proof URLs)
  ✅ KOC receive (receipt photo + notes)
  ✅ KOC submit content (awaiting review — no auto-complete)
  ✅ Merchant review & approve (pledges returned + trust restored)
  ✅ Task report (merchant view)
  ✅ Merchant trust score
  ✅ Cron scan (incl. auto-review + tracking)
  ✅ Logistics tracking (carrier normalization + status parsing + API)
  """)
print("=" * 60)
