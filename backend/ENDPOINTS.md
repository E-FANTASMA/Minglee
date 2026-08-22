# Mingle Matchmaking API (Frontend Reference)

Base URL (local): `http://localhost:4000`

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
    "onboarding_completed": false,
    "current_step": 1,
    "created_at": "2026-05-09T00:00:00.000Z",
    "updated_at": "2026-05-09T00:00:00.000Z"
  },
  "access_token": "jwt"
}
```

## Events

### `GET /events`
Fetch all events with attendee counts.

Response:
```json
{
  "events": [
    {
      "id": "uuid",
      "event_name": "Minglee Hangout",
      "event_picture": "https://example.com/event.jpg",
      "event_day": "2026-09-10",
      "created_at": "2026-08-22T10:00:00.000Z",
      "attendee_count": 42
    }
  ]
}
```

### `POST /events`
Create an event entry that Minglee will host.

Request:
```json
{
  "event_name": "Minglee Hangout",
  "event_picture": "https://example.com/event.jpg",
  "event_day": "2026-09-10"
}
```

Response:
```json
{
  "event": {
    "id": "uuid",
    "event_name": "Minglee Hangout",
    "event_picture": "https://example.com/event.jpg",
    "event_day": "2026-09-10",
    "created_at": "2026-08-22T10:00:00.000Z",
    "attendee_count": 0
  }
}
```

### `POST /events/register`
Register the signed-in user for an existing event.

Headers:
- `Authorization: Bearer <access_token>`

Request:
```json
{
  "event_id": "uuid"
}
```

Response:
```json
{
  "event": {
    "id": "uuid",
    "event_name": "Minglee Hangout",
    "event_picture": "https://example.com/event.jpg",
    "event_day": "2026-09-10",
    "created_at": "2026-08-22T10:00:00.000Z",
    "attendee_count": 43
  },
  "registration": {
    "event_id": "uuid",
    "user_id": "uuid"
  }
}
```

If the same user tries to register for the same event twice, the API returns `409 Conflict`.

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
Create or update the user profile.

Request:
```json
{
  "gender": "Female",
  "age": 22,
  "height": { "feet": 5, "inches": 6 },
  "build": "Athletic",
  "skin_tone": "Brown",
  "personal_style": "Minimalist",
  "social_persona": "Extroverted",
  "weekend_type": "Chill in",
  "afternoon_activity": "Movies",
  "habits": "Gym Routine",
  "conflict_style": "Talk it out immediately",
  "relationship_goal": "Long-term",
  "green_flag": "Kindness to others",
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
    "height": { "feet": 5, "inches": 6 },
    "build": "Athletic",
    "skin_tone": "Brown",
    "personal_style": "Minimalist",
    "social_persona": "Extroverted",
    "weekend_type": "Chill in",
    "afternoon_activity": "Movies",
    "habits": "Gym Routine",
    "conflict_style": "Talk it out immediately",
    "relationship_goal": "Long-term",
    "green_flag": "Kindness to others",
    "instagram": "@jane",
    "tiktok": "@jane"
  }
}
```

Legacy clients may still send `height` as a single number in centimeters.

### `GET /profile`
Fetch the signed-in user’s saved profile for editing.

### `POST /preferences`
Create or update partner preferences.

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
    "preferred_min_height": { "feet": 5, "inches": 3 },
    "preferred_max_height": { "feet": 6, "inches": 1 }
  }
}
```

Legacy clients may still send preference heights as centimeters.

### `GET /preferences`
Fetch the signed-in user’s saved preferences for editing.

### `POST /focuses`
Save Q9 focus selections (max 2).

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
Save preferred builds. This endpoint alone does not mark onboarding complete.

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

Allowed `conflict_style` values:
- `Talk it out immediately`
- `Need space then talk`
- `Let it blow over`

Allowed `relationship_goal` values:
- `Marriage bound`
- `Long-term`
- `Short-term`
- `Just looking for fun`

### `GET /preferred-builds`
Fetch the signed-in user’s saved preferred builds for editing.

### `POST /photos`
Save uploaded photo URLs (min 2, max 3). `upload_order` must be unique.

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

Photos remain supported but are no longer required to finish onboarding.

### `POST /photos/upload`
Upload a single image file to storage and get back an `image_url` you can pass into `POST /photos`.

- Content-Type: `multipart/form-data`
- Field name: any (the API takes the first file)
- Max size: 5MB

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
    "onboarding_completed": true,
    "current_step": 0,
    "created_at": "2026-05-09T00:00:00.000Z",
    "updated_at": "2026-05-09T00:00:00.000Z"
  },
  "profile": {
    "age": 22,
    "height": { "feet": 5, "inches": 6 },
    "build": "Athletic"
  },
  "preferences": {
    "preferred_min_age": 21,
    "preferred_max_age": 28,
    "preferred_min_height": { "feet": 5, "inches": 3 },
    "preferred_max_height": { "feet": 6, "inches": 1 }
  },
  "focuses": ["Getting my degree and doing well"],
  "preferred_builds": ["Slim", "Average"],
  "photos": [
    { "image_url": "https://example.com/1.jpg", "photo_type": "Profile", "upload_order": 1 }
  ]
}
```
