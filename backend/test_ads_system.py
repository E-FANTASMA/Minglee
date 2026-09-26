import uuid
import asyncio
from datetime import datetime, timedelta, date
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User

# Setup in-memory SQLite test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables in test DB
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

async def run_tests():
    print("=" * 80)
    print("      IN-APP ADVERTISING PLATFORM - FULL BACKEND TEST SUITE")
    print("=" * 80)

    # 1. Seed Test Users (User & Admin)
    db = TestingSessionLocal()
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    user = User(id=user_id, email="advertiser@minglee.com", full_name="Jane Advertiser", role="user")
    admin = User(id=admin_id, email="admin@minglee.com", full_name="Super Admin", role="admin")
    db.add(user)
    db.add(admin)
    db.commit()
    db.close()

    user_headers = {"X-User-Id": str(user_id)}
    admin_headers = {"X-Admin-Id": str(admin_id)}

    target_date = (date.today() + timedelta(days=2)).isoformat()
    now = datetime.utcnow()
    t_start = (now + timedelta(days=2)).isoformat() + "Z"
    t_end_24h = (now + timedelta(days=3, hours=1)).isoformat() + "Z"
    t_end_10h = (now + timedelta(days=2, hours=10)).isoformat() + "Z"

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:

        # -------------------------------------------------------------------------
        # TEST 1: Slot Availability Check
        # -------------------------------------------------------------------------
        print("\n[TEST 1] Checking Initial Daily Slot Availability...")
        res = await client.get(f"/api/v1/ads/availability/banner/{target_date}")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["max_allowed"] == 3
        assert data["slots_remaining"] == 3
        assert data["is_available"] is True
        print(f"  [OK] Banner availability on {target_date}: {data['slots_remaining']}/3 slots available.")

        # -------------------------------------------------------------------------
        # TEST 2: Payment Verification Logic
        # -------------------------------------------------------------------------
        print("\n[TEST 2] Verifying Flutterwave Payment References...")
        payment_ref_popup = f"FLW_REF_POPUP_{uuid.uuid4().hex[:8]}"
        res = await client.post("/api/v1/ads/verify-payment", json={
            "payment_reference": payment_ref_popup,
            "ad_type": "popup"
        })
        assert res.status_code == 200, res.text
        print(f"  [OK] Payment reference '{payment_ref_popup}' verified for NGN 15,000 Popup placement.")

        # -------------------------------------------------------------------------
        # TEST 3: Submit Popup Ad (24h minimum duration & media required)
        # -------------------------------------------------------------------------
        print("\n[TEST 3] Testing Popup Ad Submission Constraints...")
        
        # 3a. Invalid duration test (< 24h)
        bad_popup = {
            "payment_reference": payment_ref_popup,
            "ad_type": "popup",
            "title": "Short Popup",
            "text_content": "Super Sale Flash Event!",
            "image_url": "https://minglee.com/images/popup.png",
            "target_url": "https://minglee.com/sale",
            "scheduled_date": target_date,
            "start_time": t_start,
            "end_time": t_end_10h  # Only 10 hours
        }
        res = await client.post("/api/v1/ads/submit", json=bad_popup, headers=user_headers)
        assert res.status_code == 422, "Should reject popup duration < 24h"
        print("  [OK] Successfully rejected Popup ad with duration < 24 hours.")

        # 3b. Valid Popup Submission
        valid_popup = {
            "payment_reference": payment_ref_popup,
            "ad_type": "popup",
            "title": "Grand Launch Popup",
            "text_content": "Get 50% off all event tickets this weekend!",
            "image_url": "https://minglee.com/images/grand-popup.png",
            "target_url": "https://minglee.com/launch",
            "scheduled_date": target_date,
            "start_time": t_start,
            "end_time": t_end_24h
        }
        res = await client.post("/api/v1/ads/submit", json=valid_popup, headers=user_headers)
        assert res.status_code == 201, res.text
        popup_ad = res.json()
        popup_id = popup_ad["id"]
        assert popup_ad["status"] == "pending"
        print(f"  [OK] Submitted Popup Ad successfully. ID: {popup_id}, Status: PENDING")

        # -------------------------------------------------------------------------
        # TEST 4: Submit Notification Ad (Must link to Popup Ad)
        # -------------------------------------------------------------------------
        print("\n[TEST 4] Testing Notification Ad Linked to Popup...")
        
        # 4a. Reject notification without linked popup_id
        payment_ref_notif = f"FLW_REF_NOTIF_{uuid.uuid4().hex[:8]}"
        bad_notif = {
            "payment_reference": payment_ref_notif,
            "ad_type": "notification",
            "text_content": "Check out our special weekend popup deal!",
            "scheduled_date": target_date,
            "start_time": t_start,
            "end_time": t_end_24h
            # Missing popup_id
        }
        res = await client.post("/api/v1/ads/submit", json=bad_notif, headers=user_headers)
        assert res.status_code == 422, "Should require popup_id"
        print("  [OK] Successfully rejected Notification ad missing linked popup_id.")

        # 4b. Valid Notification Submission linked to popup_id
        valid_notif = {
            "payment_reference": payment_ref_notif,
            "ad_type": "notification",
            "text_content": "Exclusive Launch Sale! Tap to view popup discount.",
            "popup_id": popup_id,
            "scheduled_date": target_date,
            "start_time": t_start,
            "end_time": t_end_24h
        }
        res = await client.post("/api/v1/ads/submit", json=valid_notif, headers=user_headers)
        assert res.status_code == 201, res.text
        notif_ad = res.json()
        notif_id = notif_ad["id"]
        print(f"  [OK] Submitted Notification Ad successfully. ID: {notif_id}, Linked Popup: {popup_id}")

        # -------------------------------------------------------------------------
        # TEST 5: Banner Ads Limit & Initial Submission
        # -------------------------------------------------------------------------
        print("\n[TEST 5] Submitting 3 Banner Ads (Daily Limit = 3)...")
        banner_ids = []
        for i in range(1, 4):
            ref = f"FLW_REF_BANNER_{i}_{uuid.uuid4().hex[:6]}"
            banner_payload = {
                "payment_reference": ref,
                "ad_type": "banner",
                "title": f"Banner Promotion #{i}",
                "text_content": f"Special Offer #{i} for Minglee App users",
                "image_url": f"https://minglee.com/banners/banner{i}.png",
                "target_url": f"https://minglee.com/banner-{i}",
                "scheduled_date": target_date,
                "start_time": t_start,
                "end_time": t_end_24h
            }
            res = await client.post("/api/v1/ads/submit", json=banner_payload, headers=user_headers)
            assert res.status_code == 201, res.text
            banner_ids.append(res.json()["id"])
            print(f"  [OK] Banner #{i} submitted successfully. ID: {banner_ids[-1]}")

        # -------------------------------------------------------------------------
        # TEST 6: Admin Approval & Double Conflict Re-Check Logic
        # -------------------------------------------------------------------------
        print("\n[TEST 6] Admin Dashboard & Approval Workflow...")
        
        # 6a. Admin views pending list
        res = await client.get("/api/v1/admin/ads/pending", headers=admin_headers)
        assert res.status_code == 200
        pending_list = res.json()
        print(f"  [OK] Admin pending dashboard retrieved {len(pending_list)} pending ads.")

        # 6b. Admin approves Popup & Notification ads
        res = await client.post(f"/api/v1/admin/ads/{popup_id}/review", json={"action": "approve"}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "approved"
        print(f"  [OK] Admin approved Popup Ad ({popup_id}).")

        res = await client.post(f"/api/v1/admin/ads/{notif_id}/review", json={"action": "approve"}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "approved"
        print(f"  [OK] Admin approved Notification Ad ({notif_id}).")

        # 6c. Admin approves 3 Banner ads
        for b_id in banner_ids:
            res = await client.post(f"/api/v1/admin/ads/{b_id}/review", json={"action": "approve"}, headers=admin_headers)
            assert res.status_code == 200
            assert res.json()["status"] == "approved"
        print("  [OK] Admin approved 3 Banner ads.")

        # 6d. Check availability after approvals
        res = await client.get(f"/api/v1/ads/availability/banner/{target_date}")
        assert res.json()["slots_remaining"] == 0
        assert res.json()["is_available"] is False
        print(f"  [OK] Banner availability correctly updated to 0 slots remaining for {target_date}.")

        # -------------------------------------------------------------------------
        # TEST 7: Admin User Flagging & Metrics
        # -------------------------------------------------------------------------
        print("\n[TEST 7] Testing User Security Flagging & Metrics...")
        
        # Flag user profile
        res = await client.post(f"/api/v1/admin/users/{user_id}/flag", json={
            "is_flagged": True,
            "flag_reason": "Suspicious multiple payment attempts"
        }, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["is_flagged"] is True
        print(f"  [OK] User {user_id} flagged for review by admin.")

        # Get admin metrics
        res = await client.get("/api/v1/admin/dashboard", headers=admin_headers)
        assert res.status_code == 200
        metrics = res.json()
        print(f"  [OK] Admin Dashboard Metrics: Total Ads: {metrics['total_ads_submitted']}, Approved: {metrics['approved_ads_count']}, Flagged Users: {metrics['flagged_users']}")

        print("\n" + "=" * 80)
        print("   ALL TEST CASES PASSED SUCCESSFULLY WITH ZERO ERRORS!")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_tests())
