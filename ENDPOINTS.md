# Minglee API Reference (Frontend Handover)

This reference follows the routes currently registered in the repository. There are two backend services.

## Base URLs and Authentication

### Main Node API

- Local base URL: `http://localhost:4000` (port is configurable with `PORT`). Routes are mounted at `/`, with no `/api/v1` prefix.
- Send JSON with `Content-Type: application/json`.
- Authenticated Node routes require `Authorization: Bearer <access_token>`. Tokens expire after 30 days.

### Ads/Admin FastAPI

- Local base URL: `http://localhost:8000` with Uvicorn's default port. All service routes are prefixed `/api/v1`.
- API explorer: `GET /docs`; ReDoc: `GET /redoc`.
- Current FastAPI routes use `X-User-Id` / `X-Admin-Id` UUID headers, not the Node JWT. These headers are identifiers and are not secure authentication by themselves.

Validation errors return non-2xx responses with an error message. Most Node request schemas reject unknown fields.

All authenticated endpoints require:
- Header: `Authorization: Bearer <access_token>`

## Health

### `GET /health`
Response:
```json
{ "ok": true }
```

## Auth

### `POST /auth/signup`
Creates an account. `name` is 1-80 characters, `whatsapp_number` is 5-25 characters, and `password` must be at least 8 characters.

Request:
```json
{
  "name": "Jane",
  "whatsapp_number": "+2348012345678",
  "password": "min8chars"
}
```
Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane",
    "whatsapp_number": "+2348012345678",
    "role": "user",
    "ready_to_be_matched": true,
    "onboarding_completed": false,
    "current_step": 1,
    "created_at": "2026-05-09T00:00:00.000Z",
    "updated_at": "2026-05-09T00:00:00.000Z"
  },
  "access_token": "jwt"
}
```

### `POST /auth/login`
Request:
```json
{
  "whatsapp_number": "+2348012345678",
  "password": "min8chars"
}
```
Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane",
    "whatsapp_number": "+2348012345678",
    "role": "user",
    "ready_to_be_matched": true,
    "onboarding_completed": false,
    "current_step": 1,
    "created_at": "2026-05-09T00:00:00.000Z",
    "updated_at": "2026-05-09T00:00:00.000Z"
  },
  "access_token": "jwt"
}
```

## Onboarding / Profile (Auth)

### `POST /profile`
Create or update the user’s matchmaking profile.

Request (any subset is allowed; strict validation on types/enums):
```json
{
  "gender": "Female",
  "age": 22,
  "height": 168,
  "build": "Athletic",
  "skin_tone": "Brown",
  "personal_style": "Minimal",
  "social_persona": "Outgoing",
  "weekend_type": "Chill",
  "afternoon_activity": "Movies",
  "habits": "Gym",
  "conflict_style": "Talk it out immediately",
  "relationship_goal": "Long-term",
  "green_flag": "Kindness",
  "instagram": "@jane",
  "tiktok": "@jane"
}
```
Response:
```json
{
  "profile": {
    "gender": "Female",
    "age": 22,
    "height": 168,
    "build": "Athletic",
    "skin_tone": "Brown",
    "personal_style": "Minimal",
    "social_persona": "Outgoing",
    "weekend_type": "Chill",
    "afternoon_activity": "Movies",
    "habits": "Gym",
    "conflict_style": "Talk it out immediately",
    "relationship_goal": "Long-term",
    "green_flag": "Kindness",
    "instagram": "@jane",
    "tiktok": "@jane"
  }
}
```

Allowed `conflict_style` values:
- `Talk it out immediately`
- `Need space then talk`
- `Let it blow over`

Allowed `relationship_goal` values:
- `Marriage bound`
- `Long-term`
- `Short-term`
- `Just looking for fun`

### `POST /preferences`
Create or update any subset of `preferred_min_age`, `preferred_max_age`, `preferred_min_height`, and `preferred_max_height`. Ages must be at least 18; minimum values cannot exceed maximum values. Heights accept total inches or `{ "feet": number, "inches": number }` and are returned in the object form.

Request:
```json
{
  "preferred_min_age": 21,
  "preferred_max_age": 28,
  "preferred_min_height": { "feet": 5, "inches": 3 },
  "preferred_max_height": { "feet": 6, "inches": 1 }
}
```
Response:
```json
{
  "preferences": {
    "preferred_min_age": 21,
    "preferred_max_age": 28,
    "preferred_min_height": 160,
    "preferred_max_height": 190
  }
}
```

### `POST /focuses`
Save up to two focus selections.

Allowed focus values:
- `Getting my degree and doing well`
- `Building a business/project on the side`
- `Balancing school and enjoying life`
- `Still figuring things out`

Request:
```json
{
  "focuses": [
    "Getting my degree and doing well",
    "Building a business/project on the side"
  ]
}
```
Response:
```json
{
  "focuses": [
    "Getting my degree and doing well",
    "Building a business/project on the side"
  ]
}
```

### `POST /preferred-builds`
Save 1-7 preferred builds (multi-select). Values: `Slim`, `Petite`, `Athletic`, `Average`, `Muscular`, `Curvy`, `Plus-size`.

Allowed build values:
- `Slim`
- `Athletic`
- `Average`
- `Curvy`

Request:
```json
{ "builds": ["Slim", "Average"] }
```
Response:
```json
{ "preferred_builds": ["Slim", "Average"] }
```

### `POST /photos`
Save 1-2 uploaded photo URLs. `upload_order` must be unique and between 1 and 2.

Allowed `photo_type` values:
- `Profile`
- `Gallery`

Request:
```json
{
  "photos": [
    { "image_url": "https://example.com/1.jpg", "photo_type": "Profile", "upload_order": 1 },
    { "image_url": "https://example.com/2.jpg", "photo_type": "Gallery", "upload_order": 2 }
  ]
}
```
Response:
```json
{
  "photos": [
    { "image_url": "https://example.com/1.jpg", "photo_type": "Profile", "upload_order": 1 },
    { "image_url": "https://example.com/2.jpg", "photo_type": "Gallery", "upload_order": 2 }
  ]
}
```

### `POST /photos/upload`
Upload a single image file to storage and get back an `image_url` you can pass into `POST /photos`.

- Content-Type: `multipart/form-data`
- Field name: `file`
- Accepted formats: JPEG, PNG, WebP, GIF
- Max size: 5 MB; maximum two stored photos per user

Response:
```json
{ "image_url": "https://.../storage/v1/object/public/user-photos/<userId>/<uuid>.jpg", "path": "<userId>/<uuid>.jpg" }
```

### `GET /me/profile`
Fetch the full onboarding/profile payload for the current user.

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane",
    "whatsapp_number": "+2348012345678",
    "role": "user",
    "ready_to_be_matched": true,
    "onboarding_completed": false,
    "current_step": 1,
    "created_at": "2026-05-09T00:00:00.000Z",
    "updated_at": "2026-05-09T00:00:00.000Z"
  },
  "profile": { "age": 22, "build": "Athletic" },
  "preferences": { "preferred_min_age": 21, "preferred_max_age": 28 },
  "focuses": ["Getting my degree and doing well"],
  "preferred_builds": ["Slim", "Average"],
  "photos": [
    { "image_url": "https://example.com/1.jpg", "photo_type": "Profile", "upload_order": 1 }
  ]
}
```

### `PATCH /matching-preference`
Enable or disable inclusion in upcoming matching cycles. The user is identified from the authenticated session.

Request:
```json
{ "ready_to_be_matched": false }
```

Response:
```json
{ "ready_to_be_matched": false }
```

## Events

### `GET /events`
No authentication. Returns `{ "events": [...] }`, sorted by `event_day`. Each event contains `id`, `event_name`, `event_picture`, `event_day`, `ticket_price`, `created_at`, `attendee_count`, `paid_attendees_count`, `total_revenue`, and `host_payout_amount`.

### `POST /events`
No authentication is currently required. `event_name`, URL `event_picture`, and `event_day` (`YYYY-MM-DD`) are required. `ticket_price` is an optional non-negative number, default `0`.

```json
{
  "event_name": "Minglee Hangout",
  "event_picture": "https://example.com/event.jpg",
  "event_day": "2026-10-10",
  "ticket_price": 5000
}
```

Returns `201` with `{ "event": { ... } }`, including the event fields listed for `GET /events`.

### `POST /events/register` (Auth)
Registers the signed-in user for a free event and issues a ticket. Paid events must use checkout. Duplicate registration returns `409`; missing event returns `404`.

```json
{ "event_id": "event-uuid" }
```

Returns `201` with `{ "event": { ... }, "registration": { "event_id": "...", "user_id": "...", "ticket_code": "RSVP-..." } }`.

## Notifications (Auth)

All `/notifications` endpoints require the Node bearer token.

### `GET /notifications?limit=50&offset=0`
Returns `{ "success": true, "data": { "notifications": [...], "total": number, "unreadCount": number } }`. Defaults are `limit=50`, `offset=0`; expired and popup-type notifications are excluded.

### `GET /notifications/unread`
Returns `{ "success": true, "data": { "notifications": [...], "unreadCount": number } }`.

### `GET /notifications/popups` and `GET /notifications/popups/active`
Both return active, undismissed popups for the current user (including global popups), wrapped as `{ "success": true, "data": [...] }`.

### `POST /notifications`
Required: `message`. Optional: `user_id` (defaults to current user), `title` (default `Notification`), `type` (`notification` or `popup`), `category`, `is_dismissed`, `expires_at`, `metadata`, `action_url`.

```json
{ "message": "Your ticket is ready", "title": "Ticket confirmed", "metadata": { "event_id": "event-uuid" } }
```

Returns `201` with `{ "success": true, "data": { ...notification } }`.

### `POST /notifications/popups`
Required: `title`, `message`. Optional: `user_id` (default `all`), `category` (default `promo`), `expires_at`, `metadata`, `action_url`. Returns `201` with `{ "success": true, "data": { ...popup } }`.

### `POST /notifications/trigger`
Broadcast to explicit `user_ids` (non-empty array); `message` is required. Optional: `title`, `type`, `category`, `expires_at`, `metadata`, `action_url`. Returns `201` with `{ "success": true, "count": number, "data": [...] }`.

### `PATCH /notifications/read-all`
Marks all notifications for the current user as read; returns `success`, `message`, `count`, and updated `data`.

### `PATCH /notifications/{id}/read`
Marks one current-user notification as read; returns `{ "success": true, "message": "Notification marked as read", "data": { ... } }`.

### `PATCH /notifications/{id}/dismiss`
Dismisses one current-user notification or global popup; returns `{ "success": true, "message": "Notification / Popup dismissed", "data": { ... } }`.

### `DELETE /notifications/{id}`
Deletes one current-user notification; returns `{ "success": true, "message": "Notification deleted", "data": { ... } }`.

## Event Ticket Payments

**Authorization warning:** these routes currently have no JWT middleware. Initialization accepts the client-supplied `user_id`; ticket lookup accepts a user ID header/query. Do not use these as trusted user-scoped operations until identity is enforced by the server.

### `POST /payments/initialize`
Required: UUID `user_id`, UUID `event_id`, valid `email`, positive numeric `amount`. Optional: `currency` (default `NGN`), `gateway` (`paystack` or `flutterwave`, default `paystack`), `callback_url` (URL).

```json
{
  "user_id": "user-uuid",
  "event_id": "event-uuid",
  "email": "jane@example.com",
  "amount": 5000,
  "currency": "NGN",
  "gateway": "paystack",
  "callback_url": "https://example.com/payment-return"
}
```

Returns `201` with `{ "success": true, "data": { "payment": { ... }, "authorization_url": "https://...", "reference": "MGL-..." } }`. Redirect to `authorization_url`, then verify the returned reference. The Node service currently falls back to a mock checkout URL when gateway initialization fails; `MGL-` references can also be accepted by its development verification fallback. Configure real gateway credentials and disable/remove mock behavior before production.

### `GET /payments/verify/{reference}`
Verifies the gateway payment and creates/returns its ticket. Returns `{ "success": true, "data": { "payment": { ... }, "ticket": { ... } } }`.

### `GET /payments/tickets`
Requires `x-user-id: <user-uuid>` or `?user_id=<user-uuid>`. Returns `{ "success": true, "data": [...] }`.

### `POST /payments/webhook`
Paystack server callback, not a frontend endpoint. `charge.success` triggers payment verification; production requires a valid `x-paystack-signature`.

## Simple Ads (Node API)

These are separate from the paid-ad FastAPI workflow below. The current Node routes have no auth middleware.

### `GET /ads?placement=home-banner&date=2026-09-28`
Both filters are optional. Returns `{ "success": true, "data": [...] }` with active ads matching the date window and optional placement.

### `POST /ads`
Required: `title`, URL `image_url`, URL `target_url`, `placement`, `end_date`. Optional: `start_date`, `is_active` (default `true`), `impressions` and `clicks` (default `0`).

```json
{
  "title": "Weekend Spotlight",
  "image_url": "https://example.com/banner.jpg",
  "target_url": "https://example.com/events",
  "placement": "home-banner",
  "end_date": "2026-10-01T00:00:00.000Z"
}
```

Returns `201` with `{ "success": true, "data": { ...ad } }`.

### `POST /ads/{id}/impression` and `POST /ads/{id}/click`
Increment the corresponding counter. Return `success`, `message`, and updated `data`.

## WhatsApp Webhook

Meta server-to-server integration; not a frontend API.

### `GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
Returns the challenge as plain text on success; otherwise `403`.

### `POST /whatsapp/webhook`
Receives WhatsApp Business Account events. Send Meta's `X-Hub-Signature-256` when signature verification is configured. Responds `200 OK` before asynchronous processing.

## Paid Ads and Admin (FastAPI)

Business endpoint paths use the `/api/v1` prefix. Prices: banner NGN 20000, notification NGN 25000, popup NGN 15000. Approved daily limits: 3 banners, 1 notification, 1 popup. Notification and popup schedules must be at least 24 hours. Banner and popup ads require `image_url`; notification ads require `popup_id`.

### `GET /` and `GET /health`
Health endpoints outside the `/api/v1` prefix. Return `{ "status": "healthy", "app": "...", "pricing": { ... }, "daily_limits": { ... } }`.

### `GET /api/v1/ads/availability/{ad_type}/{scheduled_date}`
`ad_type`: `banner`, `notification`, or `popup`; date format: `YYYY-MM-DD`. No identity header. Returns `ad_type`, `scheduled_date`, `max_allowed`, `currently_approved`, `slots_remaining`, and `is_available`.

### `POST /api/v1/ads/verify-payment`
Body: `{ "payment_reference": "FLW_TX_123456", "ad_type": "banner" }`. Verifies Flutterwave payment/reference and amount. Response contains `id`, `payment_reference`, `amount`, `currency`, `ad_type`, `status`, `created_at`. Note: response `id` is currently a placeholder; use `payment_reference` when submitting the ad.

### `POST /api/v1/ads/submit`
Requires `X-User-Id: <user-uuid>`. Required body fields: `payment_reference`, `ad_type`, `text_content`, `scheduled_date`, `start_time`, `end_time`. Optional: `title`, `image_url`, `target_url`, `popup_id`.

```json
{
  "payment_reference": "FLW_TX_123456",
  "ad_type": "banner",
  "title": "Weekend Spotlight",
  "text_content": "Explore this weekend's events",
  "image_url": "https://example.com/banner.jpg",
  "target_url": "https://example.com/events",
  "scheduled_date": "2026-09-28",
  "start_time": "2026-09-28T00:00:00Z",
  "end_time": "2026-09-29T00:00:00Z"
}
```

Returns `201` with the ad object; initial `status` is `pending`. For notification ads, `popup_id` must reference the related popup. Popup ads require `image_url`.

### `GET /api/v1/ads/my-ads`
Requires `X-User-Id: <user-uuid>`. Returns that user's ads, newest first.

### `GET /api/v1/ads/active?ad_type=banner&target_date=2026-09-28`
No identity header. Filters are optional; date defaults to today. Returns approved ads for the scheduled date, optionally filtered by `ad_type`.

### `POST /api/v1/ads/webhook/flutterwave`
Flutterwave server callback; requires `verif-hash` matching the configured webhook secret. Not a frontend endpoint.

### `GET /api/v1/admin/ads/pending`
Requires `X-Admin-Id: <admin-user-uuid>`. Returns pending ads with submitter/flag details.

### `POST /api/v1/admin/ads/{ad_id}/review`
Requires `X-Admin-Id`. Approve with `{ "action": "approve" }`; reject with `{ "action": "reject", "rejection_reason": "Reason" }`. Rejection reason is required; approval rechecks daily slots. Returns the updated ad.

### `POST /api/v1/admin/users/{user_id}/flag`
Requires `X-Admin-Id`. Body: `{ "is_flagged": true, "flag_reason": "Review required" }`. Returns the updated user.

### `GET /api/v1/admin/dashboard`
Requires `X-Admin-Id`. Returns counts for users, flagged users, submitted/pending/approved/rejected ads, and scheduled banners/notifications/popups.

## Integration Notes

- Free RSVP: `POST /events/register`. Paid ticket: initialize payment, redirect to checkout, then verify the reference and show the issued ticket.
- Use Node `/notifications` for in-app notifications. FastAPI `/api/v1/ads/active` is the approved paid-ad feed and is distinct from Node `/ads`.
- Never expose gateway secrets in the frontend. Payment verification stays server-side.
- Node payments and simple-ad management currently lack user authorization; FastAPI identity headers are not verified credentials. Tighten server-side authorization before production use.
