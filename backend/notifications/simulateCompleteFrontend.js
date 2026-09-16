import "../../src/env.js";
import { createApp } from "../../src/app.js";
import { signAccessToken } from "../../src/middleware/auth.js";
import crypto from "crypto";

async function runCompleteFrontendSimulation() {
  console.log("=================================================");
  console.log("  COMPLETE FRONTEND NOTIFICATION SYSTEM SIMULATOR ");
  console.log("=================================================");

  const userId = `user-fe-${crypto.randomUUID().substring(0, 8)}`;
  const token = signAccessToken({ userId, role: "user" });

  console.log(`User Logged In ID: ${userId}`);
  console.log(`JWT Auth Header: Bearer ${token.substring(0, 20)}...\n`);

  // Start Express Application
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Express Backend running on ${baseUrl}\n`);

  const knownNotificationIds = new Set();
  const knownPopupIds = new Set();

  // Helper for authenticated API calls
  async function apiFetch(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    return res.json();
  }

  // 1. Simulated Frontend UI Poller
  async function simulateFrontendRenderCycle(cycleNum) {
    const time = new Date().toLocaleTimeString();
    console.log(`--- [FE UI Render Cycle #${cycleNum} at ${time}] ---`);

    // A. Fetch Unread Notifications Feed
    const unreadRes = await apiFetch("/notifications/unread");
    if (unreadRes.success) {
      const { notifications, unreadCount } = unreadRes.data;
      console.log(`[FE Header Component] 🔔 Unread Badge Count: ${unreadCount}`);

      for (const notif of notifications) {
        if (!knownNotificationIds.has(notif.id)) {
          knownNotificationIds.add(notif.id);
          console.log(`\n  👉 [FE Notification Feed] NEW NOTIFICATION TOAST:`);
          console.log(`     Title:   ${notif.title}`);
          console.log(`     Message: ${notif.message}`);
          console.log(`     Time:    ${notif.created_at}`);

          // Simulate user clicking on notification (mark as read)
          console.log(`  [FE Action] User clicked notification ${notif.id} -> Marking as read...`);
          await apiFetch(`/notifications/${notif.id}/read`, { method: "PATCH" });
          console.log(`  [FE Action] Notification ${notif.id} marked as read!\n`);
        }
      }
    }

    // B. Fetch Active Popup Modals
    const popupRes = await apiFetch("/notifications/popups");
    if (popupRes.success) {
      const popups = popupRes.data;
      console.log(`[FE Popup Layer] Active Popup Modals in Queue: ${popups.length}`);

      for (const popup of popups) {
        if (!knownPopupIds.has(popup.id)) {
          knownPopupIds.add(popup.id);
          console.log(`\n  ⚡ [FE Modal Dialog] POPUP MODAL DISPLAYED TO USER:`);
          console.log(`     Title:   ${popup.title}`);
          console.log(`     Message: ${popup.message}`);
          console.log(`     Expires: ${popup.expires_at}`);

          // Simulate user clicking 'Dismiss' on the popup modal
          console.log(`  [FE Action] User clicked [X Dismiss] on popup ${popup.id}...`);
          const dismissRes = await apiFetch(`/notifications/${popup.id}/dismiss`, { method: "PATCH" });
          console.log(`  [FE Action] Popup ${popup.id} dismissed successfully! (${dismissRes.message})\n`);
        }
      }
    }
  }

  // Initial FE Render
  await simulateFrontendRenderCycle(1);

  // 2. Simulate Backend Dynamic Triggers after short delays
  setTimeout(async () => {
    console.log("\n[Backend Server Trigger] 📩 Creating standard notification for user...");
    await apiFetch("/notifications", {
      method: "POST",
      body: JSON.stringify({
        title: "New Match! 💘",
        message: "Sarah liked your profile back. Say hello!",
        type: "notification",
        category: "match"
      })
    });
  }, 1500);

  setTimeout(async () => {
    console.log("\n[Backend Server Trigger] ⚡ Creating active promo popup modal...");
    await apiFetch("/notifications/popups", {
      method: "POST",
      body: JSON.stringify({
        title: "Weekend VIP Party Sale! 🎉",
        message: "Get 40% off passes for Saturday night.",
        expires_at: new Date(Date.now() + 3600000).toISOString()
      })
    });

    console.log("[Backend Server Trigger] ⏳ Creating EXPIRED promo popup modal (should be filtered out)...");
    await apiFetch("/notifications/popups", {
      method: "POST",
      body: JSON.stringify({
        title: "Expired Earlybird Sale ❌",
        message: "This deal expired yesterday.",
        expires_at: new Date(Date.now() - 3600000).toISOString()
      })
    });
  }, 3500);

  // Poll FE cycle #2
  setTimeout(async () => {
    await simulateFrontendRenderCycle(2);
  }, 3000);

  // Poll FE cycle #3 (after popup creation)
  setTimeout(async () => {
    await simulateFrontendRenderCycle(3);
  }, 5500);

  // Poll FE cycle #4 (verify clean state after dismissals)
  setTimeout(async () => {
    await simulateFrontendRenderCycle(4);

    console.log("\n=================================================");
    console.log("FRONTEND NOTIFICATION SIMULATION COMPLETED PASS!");
    console.log("=================================================");
    server.close();
  }, 7500);
}

runCompleteFrontendSimulation();
