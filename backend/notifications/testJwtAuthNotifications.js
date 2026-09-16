import "../../src/env.js";
import { createApp } from "../../src/app.js";
import { signAccessToken } from "../../src/middleware/auth.js";
import crypto from "crypto";

async function runJwtAuthTest() {
  console.log("=================================================");
  console.log("  JWT AUTHENTICATION NOTIFICATIONS MODULE TEST   ");
  console.log("=================================================");

  const testUserId = `jwt-user-${crypto.randomUUID().substring(0, 8)}`;
  const validToken = signAccessToken({ userId: testUserId, role: "user" });

  console.log(`Target User ID: ${testUserId}`);
  console.log(`Generated JWT Access Token: ${validToken.substring(0, 25)}...\n`);

  // Start Express App
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Express server running on ${baseUrl}\n`);

  try {
    // 1. Unauthenticated Request (Expect 401 Unauthorized)
    console.log("--> 1. Testing GET /notifications WITHOUT Authorization header...");
    const unauthRes = await fetch(`${baseUrl}/notifications`);
    console.log("Status Code:", unauthRes.status);
    const unauthBody = await unauthRes.json();
    console.log("Response Body:", JSON.stringify(unauthBody, null, 2));

    if (unauthRes.status !== 401) {
      throw new Error("Unauthenticated request should return 401 Unauthorized!");
    }

    // 2. Authenticated POST /notifications
    console.log("\n--> 2. Testing POST /notifications WITH valid Bearer Token...");
    const postRes = await fetch(`${baseUrl}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        message: "Secured notification test message",
        title: "Security Update",
        type: "system"
      })
    });

    console.log("Status Code:", postRes.status);
    const postBody = await postRes.json();
    console.log("Response Body:", JSON.stringify(postBody, null, 2));

    if (postRes.status !== 201 || !postBody.success) {
      throw new Error(`Failed authenticated POST /notifications: ${JSON.stringify(postBody)}`);
    }

    if (postBody.data.user_id !== testUserId) {
      throw new Error(`User ID in created notification (${postBody.data.user_id}) does not match JWT token user ID (${testUserId})!`);
    }

    const notifId = postBody.data.id;

    // 3. Authenticated GET /notifications
    console.log("\n--> 3. Testing GET /notifications WITH valid Bearer Token...");
    const getRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    console.log("Status Code:", getRes.status);
    const getBody = await getRes.json();
    console.log("Response Body:", JSON.stringify(getBody, null, 2));

    if (getRes.status !== 200 || !getBody.success) {
      throw new Error(`Failed authenticated GET /notifications: ${JSON.stringify(getBody)}`);
    }

    if (getBody.data.notifications.length !== 1 || getBody.data.notifications[0].id !== notifId) {
      throw new Error("GET /notifications did not return the expected notification for the authenticated user!");
    }

    // 4. Authenticated PATCH /notifications/:id/read
    console.log(`\n--> 4. Testing PATCH /notifications/${notifId}/read WITH valid Bearer Token...`);
    const readRes = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${validToken}` }
    });

    console.log("Status Code:", readRes.status);
    const readBody = await readRes.json();
    console.log("Response Body:", JSON.stringify(readBody, null, 2));

    if (readRes.status !== 200 || !readBody.success || readBody.data.is_read !== true) {
      throw new Error("Failed to mark notification as read with JWT authentication!");
    }

    console.log("\n=================================================");
    console.log(" >>> ALL JWT AUTHENTICATION VERIFICATIONS PASSED! <<<");
    console.log("=================================================");
  } catch (err) {
    console.error("\nTEST FAILED WITH ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runJwtAuthTest();
