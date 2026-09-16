# Minglee Backend API Documentation

This document specifies the endpoints, schemas, authentication, and responses for the newly integrated sub-modules: **Ad Manager**, **Notifications & Popups**, and **Payments**.

---

## 1. Ad Manager (`/backend/ads`)

Base Route: `/ads`

### 1.1 `GET /ads/active`
Fetch active, scheduled banner ads for a given placement.

- **Query Parameters**:
  - `placement` (optional): Filter by placement (`home_banner`, `event_feed`, `popup`, `sidebar`).
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ad-uuid",
      "title": "Summer Fest Banner",
      "description": "Get 20% off tickets",
      "image_url": "https://example.com/banner.png",
      "target_url": "https://example.com/events/summer-fest",
      "placement": "home_banner",
      "status": "active",
      "start_at": "2026-09-12T00:00:00Z",
      "end_at": "2026-10-12T00:00:00Z",
      "impressions_count": 120,
      "clicks_count": 15,
      "priority": 10
    }
  ]
}
```

### 1.2 `POST /ads/:id/impression`
Track an impression event for an ad.

- **URL Params**: `id` (ad UUID)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Impression tracked",
  "data": { "id": "ad-uuid", "impressions_count": 121 }
}
```

### 1.3 `POST /ads/:id/click`
Track a click event for an ad.

- **URL Params**: `id` (ad UUID)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Click tracked",
  "data": { "id": "ad-uuid", "clicks_count": 16 }
}
```

### 1.4 `GET /ads`
List all ads (Admin / Management).

- **Query Parameters**: `placement`, `status`
- **Response `200 OK`**: JSON list of all ads.

### 1.5 `POST /ads`
Create a new banner advertisement.

- **Request Body**:
```json
{
  "title": "Exclusive Party",
  "description": "Join the VIP lounge",
  "image_url": "https://example.com/ad.png",
  "target_url": "https://example.com/vip",
  "placement": "home_banner",
  "status": "active",
  "start_at": "2026-09-12T00:00:00Z",
  "end_at": "2026-09-30T00:00:00Z",
  "priority": 5
}
```
- **Response `201 Created`**: Returns created ad object.

### 1.6 `PUT /ads/:id`
Update existing ad details.

- **Request Body**: Partial ad fields (`title`, `image_url`, `status`, etc.)
- **Response `200 OK`**: Updated ad object.

### 1.7 `DELETE /ads/:id`
Delete an ad by ID.

- **Response `200 OK`**: `{"success": true, "message": "Ad deleted successfully"}`

---

## 2. Notifications & Popups (`/backend/notifications`)

Base Route: `/notifications`  
**Authentication**: Required on all routes (`Authorization: Bearer <JWT_TOKEN>`).

### 2.1 `GET /notifications`
Fetch standard notifications for the authenticated user (filters out `type = 'popup'` and expired items).

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters**: `limit` (default 50), `offset` (default 0)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "user_id": "user-uuid",
        "title": "Ticket Confirmed",
        "message": "Your ticket for Music Fest is ready!",
        "type": "notification",
        "category": "ticket",
        "is_read": false,
        "is_dismissed": false,
        "expires_at": null,
        "action_url": "/tickets/tkt-123",
        "created_at": "2026-09-14T08:00:00Z"
      }
    ],
    "total": 1,
    "unreadCount": 1
  }
}
```

### 2.2 `GET /notifications/popups`
Fetch active, un-dismissed popups for the authenticated user (where `type = 'popup'`, `is_dismissed = false`, and `expires_at >= NOW()`).

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "popup-uuid",
      "user_id": "all",
      "title": "Flash Sale! ⚡",
      "message": "50% off all VIP passes.",
      "type": "popup",
      "category": "promo",
      "is_read": false,
      "is_dismissed": false,
      "expires_at": "2026-09-15T00:00:00Z",
      "action_url": "/promos/flash-sale",
      "created_at": "2026-09-14T08:00:00Z"
    }
  ]
}
```

### 2.3 `POST /notifications`
Create a notification or popup.

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Body**:
```json
{
  "title": "Welcome to Minglee!",
  "message": "Complete your profile to find matches.",
  "type": "notification",
  "category": "info",
  "expires_at": "2026-10-01T00:00:00Z"
}
```
- **Response `201 Created`**: Returns created notification/popup object.

### 2.4 `POST /notifications/popups`
Create a modal popup broadcast.

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Body**:
```json
{
  "title": "Weekend Party Pass",
  "message": "Exclusive early bird access ends tonight!",
  "category": "promo",
  "expires_at": "2026-09-15T23:59:59Z"
}
```
- **Response `201 Created`**: Returns created popup object.

### 2.5 `PATCH /notifications/:id/read`
Mark a notification as read.

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response `200 OK`**: `{"success": true, "message": "Notification marked as read", "data": {...}}`

### 2.6 `PATCH /notifications/:id/dismiss`
Dismiss a popup or notification so it no longer appears in popups list.

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response `200 OK`**: `{"success": true, "message": "Notification / Popup dismissed", "data": {...}}`

### 2.7 `PATCH /notifications/read-all`
Mark all notifications as read for the authenticated user.

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response `200 OK`**: `{"success": true, "message": "All notifications marked as read", "count": 5}`


- **Request Body**: Title, body, image_url, target_audience, start_at, end_at.
- **Response `201 Created`**: Created popup object.

---

## 3. Payments (`/backend/payments`)

Base Route: `/payments`

### 3.1 `POST /payments/initialize`
Initialize a Paystack ticket payment transaction.

- **Request Body**:
```json
{
  "user_id": "user-uuid",
  "event_id": "event-uuid",
  "email": "user@example.com",
  "amount": 5000,
  "currency": "NGN",
  "gateway": "paystack",
  "callback_url": "https://minglee.com/payment/callback"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid",
      "reference": "MGL-1757700000000-1234",
      "status": "pending",
      "amount": 5000
    },
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "MGL-1757700000000-1234"
  }
}
```

### 3.2 `GET /payments/verify/:reference`
Verify payment status with Paystack and automatically link to ticket purchase.

- **URL Params**: `reference` (e.g. `MGL-1757700000000-1234`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "payment": { "reference": "MGL-...", "status": "success" },
    "ticket": {
      "id": "ticket-uuid",
      "ticket_code": "TKT-A1B2C3D",
      "status": "valid",
      "issued_at": "2026-09-12T21:00:00Z"
    }
  }
}
```

### 3.3 `POST /payments/webhook`
Paystack webhook handler verifying `x-paystack-signature` via HMAC SHA512.

- **Headers**: `x-paystack-signature`
- **Request Body**: Paystack event payload (e.g. `charge.success`)
- **Response `200 OK`**: `{"success": true, "data": { "payment": {...}, "ticket": {...} }}`

### 3.4 `GET /payments/tickets`
Fetch tickets owned by a user.

- **Headers / Query**: `x-user-id` header or `user_id` query param
- **Response `200 OK`**: JSON list of tickets with payment metadata.
