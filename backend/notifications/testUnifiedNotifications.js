import "../../src/env.js";
import { createApp } from "../../src/app.js";
import { signAccessToken } from "../../src/middleware/auth.js";
import crypto from "crypto";

async function runUnifiedNotificationsTest() {
  console.log("=================================================");
  console.log(" UNIFIED NOTIFICATIONS & POPUPS SYSTEM TEST      ");
  console.log("=================================================");

  const userId = `unified-user-${crypto.randomUUID().substring(0, 8)}`;
  const token = signAccessToken({ userId, role: "user" });

  console.log(`Target User ID: ${userId}\n`);

  // Start Express server
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Express server running on ${baseUrl}\n`);

  try {
    // 1. Create standard notification
    console.log("--> 1. Creating Standard Notification (type: 'notification')...");
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Standard Alert",
        message: "You have a new message",
        type: "notification"
      })
    });
    const notifData = await notifRes.json();
    console.log("Created Notification ID:", notifData.data.id);

    // 2. Create Active Popup (expires in 1 hour)
    const futureExpiry = new Date(Date.now() + 3600000).toISOString();
    console.log("\n--> 2. Creating Active Popup (type: 'popup', expires_at in 1 hr)...");
    const activePopupRes = await fetch(`${baseUrl}/notifications/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Flash Promo Modal ⚡",
        message: "Get 50% off VIP tickets!",
        expires_at: futureExpiry
      })
    });
    const activePopupData = await activePopupRes.json();
    const activePopupId = activePopupData.data.id;
    console.log("Created Active Popup ID:", activePopupId);

    // 3. Create Expired Popup (expired 1 hour ago)
    const pastExpiry = new Date(Date.now() - 3600000).toISOString();
    console.log("\n--> 3. Creating Expired Popup (type: 'popup', expires_at 1 hr ago)...");
    const expiredPopupRes = await fetch(`${baseUrl}/notifications/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Expired Sale ❌",
        message: "This sale ended already",
        expires_at: pastExpiry
      })
    });
    const expiredPopupData = await expiredPopupRes.json();
    console.log("Created Expired Popup ID:", expiredPopupData.data.id);

    // 4. Fetch Standard Notifications (GET /notifications)
    console.log("\n--> 4. Testing GET /notifications (Should return standard notification, filter popups)...");
    const getNotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getNotifData = await getNotifRes.json();
    console.log("Returned Notifications Count:", getNotifData.data.notifications.length);
    if (getNotifData.data.notifications.length !== 1 || getNotifData.data.notifications[0].type === "popup") {
      throw new Error("GET /notifications failed to separate standard notifications from popups!");
    }

    // 5. Fetch Active Popups (GET /notifications/popups)
    console.log("\n--> 5. Testing GET /notifications/popups (Should return active popup, filter expired)...");
    const getPopupsRes = await fetch(`${baseUrl}/notifications/popups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getPopupsData = await getPopupsRes.json();
    console.log("Returned Active Popups Count:", getPopupsData.data.length);
    console.log("Active Popups Data:", JSON.stringify(getPopupsData.data, null, 2));

    if (getPopupsData.data.length !== 1 || getPopupsData.data[0].id !== activePopupId) {
      throw new Error("GET /notifications/popups did not return the expected active un-expired popup!");
    }

    // 6. Dismiss Active Popup (PATCH /notifications/:id/dismiss)
    console.log(`\n--> 6. Dismissing Popup (PATCH /notifications/${activePopupId}/dismiss)...`);
    const dismissRes = await fetch(`${baseUrl}/notifications/${activePopupId}/dismiss`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    const dismissData = await dismissRes.json();
    console.log("Dismiss Status Code:", dismissRes.status);
    console.log("Dismiss Response:", JSON.stringify(dismissData, null, 2));

    if (dismissRes.status !== 200 || !dismissData.data.is_dismissed) {
      throw new Error("Failed to mark popup as dismissed!");
    }

    // 7. Re-fetch Active Popups (GET /notifications/popups)
    console.log("\n--> 7. Testing GET /notifications/popups AFTER dismissal (Should return 0 popups)...");
    const reGetPopupsRes = await fetch(`${baseUrl}/notifications/popups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const reGetPopupsData = await reGetPopupsRes.json();
    console.log("Returned Active Popups Count after dismissal:", reGetPopupsData.data.length);

    if (reGetPopupsData.data.length !== 0) {
      throw new Error("Dismissed popup was still returned by GET /notifications/popups!");
    }

    console.log("\n=================================================");
    console.log(" >>> ALL UNIFIED SYSTEM VERIFICATIONS PASSED! <<<");
    console.log("=================================================");
  } catch (err) {
    console.error("\nTEST FAILED WITH ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runUnifiedNotificationsTest();
