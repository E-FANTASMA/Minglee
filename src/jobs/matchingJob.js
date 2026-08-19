import cron from "node-cron";
import { runMatchingCycle } from "../services/matchingService.js";
import "../env.js";

export function startMatchingScheduler() {
  // Run every Friday at 12:00 AM WAT (Africa/Lagos timezone)
  cron.schedule("0 0 * * 5", async () => {
    console.log("[Scheduler] Triggering matching cycle...");
    await runMatchingCycle();
  }, {
    timezone: "Africa/Lagos"
  });
  console.log("[Scheduler] Matching scheduler started (runs Friday at 12:00 AM WAT).");
}
