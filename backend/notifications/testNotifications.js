import "../../src/env.js";
import { createApp } from "../../src/app.js";
import { notificationService } from "./notificationService.js";
import crypto from "crypto";

async function runTest() {
  console.log("=================================================");
  console.log("      NOTIFICATIONS MODULE ENDPOINT TEST        ");
  console.log("=================================================");

  const testUserId = crypto.randomUUID();
  console.log("Generated Test User ID:", testUserId);

  // Start Express server on random port
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server listening on ${baseUrl}\n`);

  try {
    // STEP 1: Create a notification
    console.log("--- 1. POST /notifications (Create Notification) ---");
    const createRes = await fetch(`${baseUrl}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: testUserId,
        title: "Event Reminder",
        message: "Your upcoming event starts in 1 hour!",
        type: "event",
        action_url: "/events/event-xyz-99"
      })
    });

    const createBody = await createRes.json();
    console.log("Status Code:", createRes.status);
    console.log("Response Body:", JSON.stringify(createBody, null, 2));

    if (createRes.status !== 201 || !createBody.success) {
      throw new Error(`Failed POST /notifications: ${JSON.stringify(createBody)}`);
    }

    const createdNotif = createBody.data;
    const notifId = createdNotif.id;

    // Verify initial values
    if (createdNotif.is_read !== false) throw new Error("Created notification must have is_read = false");
    if (createdNotif.user_id !== testUserId) throw new Error("User ID mismatch");

    // STEP 2: Retrieve notifications for user
    console.log("\n--- 2. GET /notifications (Retrieve User Notifications) ---");
    const getRes = await fetch(`${baseUrl}/notifications?user_id=${testUserId}`, {
      method: "GET",
      headers: { "x-user-id": testUserId }
    });

    const getBody = await getRes.json();
    console.log("Status Code:", getRes.status);
    console.log("Response Body:", JSON.stringify(getBody, null, 2));

    if (getRes.status !== 200 || !getBody.success) {
      throw new Error(`Failed GET /notifications: ${JSON.stringify(getBody)}`);
    }

    const notifList = getBody.data.notifications;
    const unreadCount = getBody.data.unreadCount;

    if (notifList.length !== 1 || notifList[0].id !== notifId) {
      throw new Error("Retrieved notifications array does not contain created notification!");
    }
    if (unreadCount !== 1) {
      throw new Error(`Expected unreadCount = 1, received ${unreadCount}`);
    }

    // STEP 3: Mark notification as read
    console.log("\n--- 3. PATCH /notifications/:id/read (Mark as Read) ---");
    const readRes = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": testUserId
      },
      body: JSON.stringify({ user_id: testUserId })
    });

    const readBody = await readRes.json();
    console.log("Status Code:", readRes.status);
    console.log("Response Body:", JSON.stringify(readBody, null, 2));

    if (readRes.status !== 200 || !readBody.success) {
      throw new Error(`Failed PATCH /notifications/${notifId}/read: ${JSON.stringify(readBody)}`);
    }

    if (readBody.data.is_read !== true) {
      throw new Error("Notification is_read flag was not set to true");
    }
    if (!readBody.data.read_at) {
      throw new Error("Missing read_at timestamp upon marking read");
    }

    // STEP 4: Retrieve notifications again to verify unreadCount = 0 and is_read = true
    console.log("\n--- 4. Verify Updated State via GET /notifications ---");
    const getRes2 = await fetch(`${baseUrl}/notifications?user_id=${testUserId}`, {
      method: "GET",
      headers: { "x-user-id": testUserId }
    });
    const getBody2 = await getRes2.json();
    console.log("Updated unreadCount:", getBody2.data.unreadCount);
    console.log("Updated notification is_read:", getBody2.data.notifications[0].is_read);

    if (getBody2.data.unreadCount !== 0) {
      throw new Error("unreadCount should be 0 after marking notification as read!");
    }
    if (getBody2.data.notifications[0].is_read !== true) {
      throw new Error("is_read should be true in retrieved list!");
    }

    // Cleanup
    await notificationService.deleteNotification(notifId, testUserId);

    console.log("\n=================================================");
    console.log(" >>> ALL NOTIFICATION VERIFICATIONS PASSED! <<<  ");
    console.log("=================================================");
  } catch (err) {
    console.error("\nTEST FAILED WITH ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTest();
