# 🚀 In-App Advertising & Event Promotion Platform
## Frontend & PWA Integration Handover Document

Welcome! This document contains everything you need to integrate the **In-App Advertising & Event Promotion Platform** into the Frontend (PWA / Mobile / Web App).

---

## 📋 1. Business Rules & Pricing Matrix

| Ad Format | Price (NGN) | Daily Limit | Key Constraints & Behavior |
| :--- | :--- | :--- | :--- |
| **Banner Ad** | **₦20,000** | **Max 3** / day | Rotating image carousel banner. Requires single image URL, text, and target URL. |
| **Notification Ad** | **₦25,000** | **Max 1** / day | Minimum **24h duration**. Must link to a valid `popup_id`. Triggers popup when clicked. |
| **Popup Ad** | **₦15,000** | **Max 1** / day | Minimum **24h duration**. Requires single image URL, text, and target URL. Destination content of notification. |

---

## 💳 2. Flutterwave Payment Flow for Frontend (PWA / Web)

Access to ad creation is strictly allowed **after payment completion**.

### Frontend Payment Step-by-Step:
1. Include Flutterwave Inline JS SDK in your frontend HTML / PWA:
   ```html
   <script src="https://checkout.flutterwave.com/v3.js"></script>
   ```
2. Trigger the Flutterwave Payment Modal:
   ```javascript
   function initiateAdPayment(adType, adDetails) {
     const prices = { banner: 20000, notification: 25000, popup: 15000 };
     const txRef = `FLW_TX_${adType.toUpperCase()}_${Date.now()}`;

     FlutterwaveCheckout({
       public_key: "FLWPUBK_TEST-sandbox-public-key", // Replace with Live Public Key in prod
       tx_ref: txRef,
       amount: prices[adType],
       currency: "NGN",
       payment_options: "card, ussd, banktransfer",
       callback: function (response) {
         if (response.status === "successful") {
           // Payment Verified -> Submit Ad Payload to Backend API
           submitAdToBackend(txRef, adType, adDetails);
         }
       }
     });
   }
   ```

---

## 🔌 3. Complete API Endpoint Reference

**Base URL**: `http://<your-backend-host>:4000/api/v1`

### A. Ad Creation & User Endpoints (`/ads`)

#### 1. Check Daily Slot Availability
- **Method**: `GET`
- **Path**: `/ads/availability/{ad_type}/{scheduled_date}`
- **Parameters**: 
  - `ad_type`: `banner` | `notification` | `popup`
  - `scheduled_date`: `YYYY-MM-DD`
- **Response**:
  ```json
  {
    "ad_type": "banner",
    "scheduled_date": "2026-09-26",
    "max_allowed": 3,
    "currently_approved": 1,
    "slots_remaining": 2,
    "is_available": true
  }
  ```

---

#### 2. Submit Popup Ad
- **Method**: `POST`
- **Path**: `/ads/submit`
- **Headers**: `X-User-Id: <user-uuid>`
- **Body Payload**:
  ```json
  {
    "payment_reference": "FLW_TX_POPUP_123456",
    "ad_type": "popup",
    "title": "Grand Music Fest",
    "text_content": "Get 50% Off VIP Passes this weekend only!",
    "image_url": "https://cdn.minglee.com/promos/fest_popup.jpg",
    "target_url": "https://minglee.com/events/fest",
    "scheduled_date": "2026-09-26",
    "start_time": "2026-09-26T00:00:00Z",
    "end_time": "2026-09-27T00:00:00Z"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": "a7a642e5-3376-442c-9f69-b7a07732fe25",
    "user_id": "2cb301b3-b102-4ad7-8dfc-e96b46810b77",
    "ad_type": "popup",
    "status": "pending",
    "created_at": "2026-09-24T21:00:00Z"
  }
  ```

---

#### 3. Submit Notification Ad (Linked to Popup)
- **Method**: `POST`
- **Path**: `/ads/submit`
- **Headers**: `X-User-Id: <user-uuid>`
- **Body Payload**:
  ```json
  {
    "payment_reference": "FLW_TX_NOTIF_789012",
    "ad_type": "notification",
    "text_content": "🔥 Flash Sale! Tap to view 50% off Fest Passes.",
    "popup_id": "a7a642e5-3376-442c-9f69-b7a07732fe25",
    "scheduled_date": "2026-09-26",
    "start_time": "2026-09-26T00:00:00Z",
    "end_time": "2026-09-27T00:00:00Z"
  }
  ```

---

#### 4. Submit Banner Ad
- **Method**: `POST`
- **Path**: `/ads/submit`
- **Headers**: `X-User-Id: <user-uuid>`
- **Body Payload**:
  ```json
  {
    "payment_reference": "FLW_TX_BANNER_345678",
    "ad_type": "banner",
    "title": "Weekend Spotlight",
    "text_content": "Check out top trending events in Lagos!",
    "image_url": "https://cdn.minglee.com/banners/hero1.jpg",
    "target_url": "https://minglee.com/explore",
    "scheduled_date": "2026-09-26",
    "start_time": "2026-09-26T00:00:00Z",
    "end_time": "2026-09-27T00:00:00Z"
  }
  ```

---

#### 5. Get Active Display Feed for App Display
- **Method**: `GET`
- **Path**: `/ads/active?target_date=2026-09-26&ad_type=banner`
- **Response**: Returns list of admin-approved active ads for carousel, push notifications, and popups.

---

### B. Admin Dashboard & Approval Endpoints (`/admin`)

#### 1. View Pending Ads Queue
- **Method**: `GET`
- **Path**: `/admin/ads/pending`
- **Headers**: `X-Admin-Id: <admin-uuid>`
- **Response**: List of pending ads including submitting user details & security flags (`is_flagged`).

---

#### 2. Approve or Reject Pending Ad (Double Conflict Re-Check)
- **Method**: `POST`
- **Path**: `/admin/ads/{ad_id}/review`
- **Headers**: `X-Admin-Id: <admin-uuid>`
- **Body Payload (Approve)**:
  ```json
  {
    "action": "approve"
  }
  ```
- **Body Payload (Reject)**:
  ```json
  {
    "action": "reject",
    "rejection_reason": "Content violates community advertising policy"
  }
  ```

---

#### 3. Flag / Unflag Suspicious User Account
- **Method**: `POST`
- **Path**: `/admin/users/{user_id}/flag`
- **Headers**: `X-Admin-Id: <admin-uuid>`
- **Body Payload**:
  ```json
  {
    "is_flagged": true,
    "flag_reason": "Multiple disputed payments reported"
  }
  ```

---

#### 4. Platform Metrics & Visibility Analytics
- **Method**: `GET`
- **Path**: `/admin/dashboard`
- **Headers**: `X-Admin-Id: <admin-uuid>`
- **Response**:
  ```json
  {
    "total_users": 150,
    "active_users": 148,
    "flagged_users": 2,
    "total_ads_submitted": 25,
    "pending_ads_count": 3,
    "approved_ads_count": 20,
    "rejected_ads_count": 2,
    "banners_scheduled": 3,
    "notifications_scheduled": 1,
    "popups_scheduled": 1
  }
  ```

---

## 📱 4. UI Component Integration Instructions

1. **Carousel Banner Component**:
   - Query `GET /api/v1/ads/active?ad_type=banner`.
   - Render up to 3 banner images in an auto-rotating carousel.
   - On click, navigate to `target_url`.

2. **Push Notification / Notification Center**:
   - Query `GET /api/v1/ads/active?ad_type=notification`.
   - Render notification in the bell dropdown or trigger Web Push Notification.
   - On click, fetch linked `popup_id` details and trigger the Popup Modal window.

3. **Popup Modal Overlay Component**:
   - Query `GET /api/v1/ads/active?ad_type=popup` or fetch by `popup_id`.
   - Display overlay dialog with `image_url`, `text_content`, and call-to-action button linking to `target_url`.

4. **Admin Review Panel**:
   - Display pending queue. Highlight user rows where `is_flagged == true` with a warning badge.

---

## 🛠️ 5. Database File & Execution

- SQL DDL File: [`backend/ads_promotion_schema.sql`](file:///c:/Users/ojoje/OneDrive/Desktop/My%20project/minglee/Minglee/backend/ads_promotion_schema.sql)
- Automated Test Suite: [`backend/test_ads_system.py`](file:///c:/Users/ojoje/OneDrive/Desktop/My%20project/minglee/Minglee/backend/test_ads_system.py)
- Frontend Integration Simulator: [`backend/frontend_simulator.py`](file:///c:/Users/ojoje/OneDrive/Desktop/My%20project/minglee/Minglee/backend/frontend_simulator.py)

---
*Created automatically for the Minglee Development Team.*
