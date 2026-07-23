import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import {
  BUILD_VALUES,
  CONFLICT_STYLE_VALUES,
  FOCUS_VALUES,
  GREEN_FLAG_VALUES,
  HABITS_VALUES,
  PERSONAL_STYLE_VALUES,
  SOCIAL_PERSONA_VALUES,
  WEEKEND_TYPE_VALUES
} from "../src/constants/profileValues.js";
import { createApp } from "../src/app.js";

let server;
let baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:4000";

before(async () => {
  if (process.env.TEST_BASE_URL) return;

  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

const GENDERS = ["Male", "Female", "Non-binary"];
const SKIN_TONES = ["Fair", "Tan", "Brown", "Dark"];
const AFTERNOON_ACTIVITIES = ["Reading", "Gym", "Movies", "Gaming", "Nature Walk"];
const RELATIONSHIP_GOALS = ["Marriage bound", "Long-term", "Short-term", "Just looking for fun"];

function pickOne(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function pickMany(values, min, max) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...values].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status } = await api("/health");
      if (status === 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server not reachable at ${baseUrl}`);
}

async function signupUser() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const whatsapp_number = `+23480${suffix.slice(-8)}`;
  const password = "testpass123";

  const { status, data } = await api("/auth/signup", {
    method: "POST",
    body: {
      name: `Test User ${suffix}`,
      whatsapp_number,
      password
    }
  });

  assert.equal(status, 201, `signup failed: ${JSON.stringify(data)}`);
  assert.ok(data.access_token, "signup should return access_token");

  return { token: data.access_token, whatsapp_number, password };
}

async function runOnboarding(token) {
  const profilePayload = {
    gender: pickOne(GENDERS),
    age: randomInt(18, 35),
    height: randomInt(155, 195),
    build: pickOne(BUILD_VALUES),
    skin_tone: pickOne(SKIN_TONES),
    personal_style: pickOne(PERSONAL_STYLE_VALUES),
    social_persona: pickOne(SOCIAL_PERSONA_VALUES),
    weekend_type: pickOne(WEEKEND_TYPE_VALUES),
    afternoon_activity: pickOne(AFTERNOON_ACTIVITIES),
    habits: pickOne(HABITS_VALUES),
    conflict_style: pickOne(CONFLICT_STYLE_VALUES),
    relationship_goal: pickOne(RELATIONSHIP_GOALS),
    green_flag: pickMany(GREEN_FLAG_VALUES, 1, 2).join(", "),
    instagram: `@test${Date.now()}`,
    tiktok: `@test${Date.now()}`
  };

  const profileRes = await api("/profile", { method: "POST", body: profilePayload, token });
  assert.equal(profileRes.status, 201, `profile failed: ${JSON.stringify(profileRes.data)}`);

  for (const [field, expected] of Object.entries(profilePayload)) {
    assert.equal(profileRes.data.profile[field], expected, `${field} should round-trip unchanged`);
  }

  const preferencesPayload = {
    preferred_min_age: randomInt(18, 22),
    preferred_max_age: randomInt(28, 35),
    preferred_min_height: randomInt(150, 165),
    preferred_max_height: randomInt(175, 200)
  };

  const preferencesRes = await api("/preferences", { method: "POST", body: preferencesPayload, token });
  assert.equal(preferencesRes.status, 201, `preferences failed: ${JSON.stringify(preferencesRes.data)}`);

  const focuses = pickMany(FOCUS_VALUES, 1, 2);
  const focusesRes = await api("/focuses", { method: "POST", body: { focuses }, token });
  assert.equal(focusesRes.status, 201, `focuses failed: ${JSON.stringify(focusesRes.data)}`);
  assert.deepEqual(focusesRes.data.focuses, focuses);

  const builds = pickMany(BUILD_VALUES, 1, 3);
  const buildsRes = await api("/preferred-builds", { method: "POST", body: { builds }, token });
  assert.equal(buildsRes.status, 201, `preferred-builds failed: ${JSON.stringify(buildsRes.data)}`);
  assert.deepEqual(buildsRes.data.preferred_builds, builds);

  const photosRes = await api("/photos", {
    method: "POST",
    body: {
      photos: [
        {
          image_url: "https://example.com/photo1.jpg",
          photo_type: "Profile",
          upload_order: 1
        },
        {
          image_url: "https://example.com/photo2.jpg",
          photo_type: "Gallery",
          upload_order: 2
        }
      ]
    },
    token
  });
  assert.equal(photosRes.status, 201, `photos failed: ${JSON.stringify(photosRes.data)}`);

  const meRes = await api("/me/profile", { token });
  assert.equal(meRes.status, 200, `me/profile failed: ${JSON.stringify(meRes.data)}`);
  assert.equal(meRes.data.user.onboarding_completed, true);

  for (const [field, expected] of Object.entries(profilePayload)) {
    assert.equal(meRes.data.profile[field], expected, `GET profile ${field} should match stored value`);
  }

  assert.deepEqual(meRes.data.focuses, focuses);
  assert.deepEqual(meRes.data.preferred_builds, builds);
  assert.equal(meRes.data.photos.length, 2);

  return profilePayload;
}

test("onboarding e2e: signup + random selections completes without normalization errors", async () => {
  await waitForServer();
  const { token } = await signupUser();
  await runOnboarding(token);
});

test("onboarding e2e: second account with different random selections", async () => {
  await waitForServer();
  const { token } = await signupUser();
  await runOnboarding(token);
});

test("onboarding e2e: conflict_style frontend values persist exactly", async () => {
  await waitForServer();

  for (const conflict_style of CONFLICT_STYLE_VALUES) {
    const { token } = await signupUser();
    const profileRes = await api("/profile", {
      method: "POST",
      body: {
        gender: "Female",
        age: 22,
        height: 165,
        build: "Athletic",
        skin_tone: "Brown",
        personal_style: "Minimalist",
        social_persona: "Extroverted",
        weekend_type: "Chill in",
        afternoon_activity: "Movies",
        habits: "Gym Routine",
        conflict_style,
        relationship_goal: "Long-term",
        green_flag: "Kindness to others",
        instagram: `@conflict${Date.now()}`,
        tiktok: `@conflict${Date.now()}`
      },
      token
    });

    assert.equal(profileRes.status, 201, `conflict_style=${conflict_style} failed: ${JSON.stringify(profileRes.data)}`);
    assert.equal(profileRes.data.profile.conflict_style, conflict_style);
  }
});

test("legacy complete-onboarding route remains compatible", async () => {
  await waitForServer();
  const { token } = await signupUser();

  const payload = {
    gender: "Female",
    age: 24,
    height: 168,
    build: "Athletic",
    skin_tone: "Brown",
    personal_style: "Minimalist",
    social_persona: "Ambiverted",
    weekend_type: "Chill in",
    afternoon_activity: "Movies",
    habits: "Gym Routine",
    conflict_style: "Need space then talk",
    relationship_goal: "Long-term",
    green_flag: "Kindness to others",
    instagram: `@legacy${Date.now()}`,
    tiktok: `@legacy${Date.now()}`,
    preferred_min_age: 20,
    preferred_max_age: 28,
    preferred_min_height: 160,
    preferred_max_height: 185,
    focuses: ["Getting my degree and doing well"],
    preferred_builds: ["Slim", "Athletic"],
    uploaded_photos: [
      { image_url: "https://example.com/legacy-1.jpg" },
      { image_url: "https://example.com/legacy-2.jpg" }
    ]
  };

  const completeRes = await api("/complete-onboarding", {
    method: "POST",
    body: payload,
    token
  });

  assert.equal(completeRes.status, 201, `legacy complete-onboarding failed: ${JSON.stringify(completeRes.data)}`);

  const meRes = await api("/me/profile", { token });
  assert.equal(meRes.status, 200, `me/profile failed: ${JSON.stringify(meRes.data)}`);
  assert.equal(meRes.data.user.onboarding_completed, true);
  assert.equal(meRes.data.profile.gender, payload.gender);
  assert.equal(meRes.data.preferences.preferred_min_age, payload.preferred_min_age);
  assert.deepEqual(meRes.data.focuses, payload.focuses);
  assert.deepEqual(meRes.data.preferred_builds, payload.preferred_builds);
  assert.equal(meRes.data.photos.length, 2);
});
