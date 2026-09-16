import "../../src/env.js";
import { createApp } from "../../src/app.js";
import crypto from "crypto";

async function runFrontendSimulation() {
  console.log("=================================================");
  console.log("   SIMULATING FRONTEND UNREAD NOTIFICATION POLLING");
  console.log("=================================================");

  const userId = `user-sim-${crypto.randomUUID().substring(0, 8)}`;
  console.log(`Target User ID: ${userId}`);

  // Start Express App
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Express server running on ${baseUrl}\n`);

  const seenNotificationIds = new Set();
  let pollCount = 0;

  // Frontend polling function
  async function pollUnreadNotifications() {
    pollCount++;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Frontend Simulator ${timestamp}] Polling GET /notifications/unread... (Poll #${pollCount})`);

    try {
      const res = await fetch(`${baseUrl}/notifications/unread?user_id=${userId}`, {
        headers: { "x-user-id": userId }
      });
      const data = await res.json();

      if (data.success) {
        const unreadList = data.data.notifications;
        const unreadCount = data.data.unreadCount;
        console.log(`[Frontend Simulator] Unread count: ${unreadCount}`);

        // Check for new notifications
        for (const notif of unreadList) {
          if (!seenNotificationIds.has(notif.id)) {
            seenNotificationIds.add(notif.id);
            console.log("\n=================================================");
            console.log(`🔔 [Frontend Simulator] NEW NOTIFICATION RECEIVED!`);
            console.log(`   ID:       ${notif.id}`);
            console.log(`   Title:    ${notif.title || "Notification"}`);
            console.log(`   Message:  ${notif.message}`);
            console.log(`   Type:     ${notif.type || "info"}`);
            console.log(`   Time:     ${notif.created_at}`);
            console.log("=================================================\n");
          }
        }
      }
    } catch (err) {
      console.error("[Frontend Simulator] Polling error:", err.message);
    }
  }

  // Trigger initial poll immediately
  await pollUnreadNotifications();

  // Start polling interval (every 2 seconds)
  const pollInterval = setInterval(pollUnreadNotifications, 2000);

  // Helper to simulate backend pushing a notification after a delay
  function triggerBackendNotification(title, message, delayMs) {
    setTimeout(async () => {
      console.log(`\n[Backend Event Trigger] Inserting notification for ${userId}...`);
      const postRes = await fetch(`${baseUrl}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title,
          message,
          type: "event"
        })
      });
      const postData = await postRes.json();
      console.log(`[Backend Event Trigger] Notification inserted successfully (ID: ${postData.data.id})\n`);
    }, delayMs);
  }

  // Schedule background notifications to arrive during simulation
  triggerBackendNotification("Match Alert! 💘", "Someone new liked your profile!", 2500);
  triggerBackendNotification("Ticket Confirmed 🎫", "Your Minglee VIP Party pass is ready.", 5500);

  // Stop simulation after 9 seconds
  setTimeout(() => {
    clearInterval(pollInterval);
    server.close();
    console.log("=================================================");
    console.log("FRONTEND POLLING SIMULATION COMPLETED SUCCESSFULLY");
    console.log(`Total Polls Executed: ${pollCount}`);
    console.log(`Total New Notifications Received: ${seenNotificationIds.size}`);
    console.log("=================================================");
  }, 9000);
}

runFrontendSimulation();
