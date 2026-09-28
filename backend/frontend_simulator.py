import uuid
import asyncio
from datetime import datetime, timedelta, date
import httpx

from app.main import app
from app.database import Base, get_db
from app.models import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup in-memory test DB for simulator
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

async def run_frontend_simulator():
    print("*" * 80)
    print("       MINGLEE IN-APP ADVERTISING PLATFORM - FRONTEND SIMULATOR")
    print("*" * 80)

    # 1. Initialize Users
    db = TestingSessionLocal()
    advertiser_id = uuid.uuid4()
    admin_id = uuid.uuid4()

    advertiser = User(id=advertiser_id, name="Sparkle Events Co.", role="user")
    admin = User(id=admin_id, name="Minglee Platform Admin", role="admin")
    db.add(advertiser)
    db.add(admin)
    db.commit()
    db.close()

    user_headers = {"X-User-Id": str(advertiser_id)}
    admin_headers = {"X-Admin-Id": str(admin_id)}

    target_date = (date.today() + timedelta(days=1)).isoformat()
    now = datetime.utcnow()
    start_time = (now + timedelta(days=1)).isoformat() + "Z"
    end_time_24h = (now + timedelta(days=2, hours=1)).isoformat() + "Z"

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ---------------------------------------------------------------------
        # STEP 1: Check Slot Availability
        # ---------------------------------------------------------------------
        print("\n--- STEP 1: USER CHECKS AD SLOT AVAILABILITY ---")
        for ad_type in ["banner", "notification", "popup"]:
            res = await client.get(f"/api/v1/ads/availability/{ad_type}/{target_date}")
            slot_info = res.json()
            print(f"  [{ad_type.upper()}] Date: {target_date} | Max: {slot_info['max_allowed']} | Free Slots: {slot_info['slots_remaining']} | Available: {slot_info['is_available']}")

        # ---------------------------------------------------------------------
        # STEP 2: Flutterwave Payment Verification & Ad Submission
        # ---------------------------------------------------------------------
        print("\n--- STEP 2: FLUTTERWAVE PAYMENT & AD SUBMISSION ---")

        # 2a. Submit Popup Ad (NGN 15,000)
        popup_pay_ref = f"FLW_TX_POPUP_{uuid.uuid4().hex[:6]}"
        print(f"\n[User Action] User completes Flutterwave payment of NGN 15,000 -> Ref: {popup_pay_ref}")
        popup_payload = {
            "payment_reference": popup_pay_ref,
            "ad_type": "popup",
            "title": "VIP Summer Music Fest Promo",
            "text_content": "Get 40% Off VIP Passes for Minglee Music Fest this Saturday! Exclusive to Minglee users.",
            "image_url": "https://cdn.minglee.com/promos/vip_music_fest.jpg",
            "target_url": "https://minglee.com/events/vip-music-fest",
            "scheduled_date": target_date,
            "start_time": start_time,
            "end_time": end_time_24h
        }
        res = await client.post("/api/v1/ads/submit", json=popup_payload, headers=user_headers)
        popup_ad = res.json()
        popup_id = popup_ad["id"]
        print(f"  [SUCCESS] Popup Ad Created! ID: {popup_id} | Status: {popup_ad['status']}")

        # 2b. Submit Notification Ad (NGN 25,000) linked to Popup Ad
        notif_pay_ref = f"FLW_TX_NOTIF_{uuid.uuid4().hex[:6]}"
        print(f"\n[User Action] User completes Flutterwave payment of NGN 25,000 -> Ref: {notif_pay_ref}")
        notif_payload = {
            "payment_reference": notif_pay_ref,
            "ad_type": "notification",
            "text_content": "Flash Discount! Tap to unlock 40% off VIP Music Fest Passes.",
            "popup_id": popup_id,
            "scheduled_date": target_date,
            "start_time": start_time,
            "end_time": end_time_24h
        }
        res = await client.post("/api/v1/ads/submit", json=notif_payload, headers=user_headers)
        notif_ad = res.json()
        notif_id = notif_ad["id"]
        print(f"  [SUCCESS] Notification Ad Created! ID: {notif_id} | Linked Popup ID: {popup_id}")

        # 2c. Submit 3 Banner Ads (NGN 20,000 each)
        banner_ids = []
        for b in range(1, 4):
            b_ref = f"FLW_TX_BANNER_{b}_{uuid.uuid4().hex[:6]}"
            print(f"\n[User Action] User completes Flutterwave payment of NGN 20,000 for Banner #{b} -> Ref: {b_ref}")
            banner_payload = {
                "payment_reference": b_ref,
                "ad_type": "banner",
                "title": f"Featured Event Showcase #{b}",
                "text_content": f"Discover top trending weekend hangouts in your area! Banner #{b}",
                "image_url": f"https://cdn.minglee.com/banners/banner_{b}.jpg",
                "target_url": f"https://minglee.com/banner-{b}",
                "scheduled_date": target_date,
                "start_time": start_time,
                "end_time": end_time_24h
            }
            res = await client.post("/api/v1/ads/submit", json=banner_payload, headers=user_headers)
            b_ad = res.json()
            banner_ids.append(b_ad["id"])
            print(f"  [SUCCESS] Banner Ad #{b} Created! ID: {b_ad['id']} | Status: {b_ad['status']}")

        # ---------------------------------------------------------------------
        # STEP 3: Admin Review & Approval Workflow
        # ---------------------------------------------------------------------
        print("\n--- STEP 3: ADMIN DASHBOARD & APPROVAL WORKFLOW ---")
        
        # Fetch pending list
        res = await client.get("/api/v1/admin/ads/pending", headers=admin_headers)
        pending_items = res.json()
        print(f"\n[Admin Panel] Pending Ads Review Queue ({len(pending_items)} ads waiting approval):")
        for item in pending_items:
            print(f"  - [{item['ad_type'].upper()}] Title: '{item.get('title') or item['text_content'][:30]}' | Date: {item['scheduled_date']} | Status: {item['status']}")

        # Approve Popup
        print(f"\n[Admin Action] Approving Popup Ad ({popup_id})...")
        res = await client.post(f"/api/v1/admin/ads/{popup_id}/review", json={"action": "approve"}, headers=admin_headers)
        print(f"  [APPROVED] New Status: {res.json()['status']}")

        # Approve Notification
        print(f"\n[Admin Action] Approving Notification Ad ({notif_id})...")
        res = await client.post(f"/api/v1/admin/ads/{notif_id}/review", json={"action": "approve"}, headers=admin_headers)
        print(f"  [APPROVED] New Status: {res.json()['status']}")

        # Approve 3 Banners
        print("\n[Admin Action] Approving 3 Banner Ads...")
        for b_id in banner_ids:
            res = await client.post(f"/api/v1/admin/ads/{b_id}/review", json={"action": "approve"}, headers=admin_headers)
            print(f"  [APPROVED] Banner ID {b_id} -> Status: {res.json()['status']}")

        # ---------------------------------------------------------------------
        # STEP 4: Live In-App Display Feed Simulation
        # ---------------------------------------------------------------------
        print("\n--- STEP 4: LIVE IN-APP DISPLAY FEED SIMULATION ---")
        res = await client.get(f"/api/v1/ads/active?target_date={target_date}")
        active_feed = res.json()
        print(f"\n[Minglee Mobile App] Fetched Active Ads Feed for {target_date}: Total Active: {len(active_feed)}")
        
        for item in active_feed:
            if item['ad_type'] == 'banner':
                print(f"  [CAROUSEL BANNER] Image: {item['image_url']} | Title: '{item['title']}' | Link: {item['target_url']}")
            elif item['ad_type'] == 'notification':
                print(f"  [PUSH NOTIFICATION] Message: '{item['text_content']}' -> Triggers Linked Popup: {item['popup_id']}")
            elif item['ad_type'] == 'popup':
                print(f"  [POPUP WINDOW] Image: {item['image_url']} | Text: '{item['text_content']}' | Link: {item['target_url']}")

        # ---------------------------------------------------------------------
        # STEP 5: Platform Metrics Summary
        # ---------------------------------------------------------------------
        print("\n--- STEP 5: ADMIN PLATFORM ANALYTICS ---")
        res = await client.get("/api/v1/admin/dashboard", headers=admin_headers)
        metrics = res.json()
        print(f"  [METRIC] Total Ads Submitted: {metrics['total_ads_submitted']}")
        print(f"  [METRIC] Approved Ads Count:  {metrics['approved_ads_count']}")
        print(f"  [METRIC] Flagged Users:       {metrics['flagged_users']}")
        print(f"  [METRIC] Scheduled Banners:   {metrics['banners_scheduled']}/3")
        print(f"  [METRIC] Scheduled Notifs:    {metrics['notifications_scheduled']}/1")
        print(f"  [METRIC] Scheduled Popups:    {metrics['popups_scheduled']}/1")

    print("\n" + "*" * 80)
    print("     FRONTEND & BACKEND INTEGRATION SIMULATION COMPLETED SUCCESSFULLY!")
    print("*" * 80)

if __name__ == "__main__":
    asyncio.run(run_frontend_simulator())
