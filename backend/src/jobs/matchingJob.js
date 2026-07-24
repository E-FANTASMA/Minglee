import cron from "node-cron";
import { runMatchingCycle } from "../services/matchingService.js";
import "../env.js";

export function startMatchingScheduler() {
  // Run every Friday at 3:30 AM
  cron.schedule("30 3 * * 5", async () => {
    console.log("[Scheduler] Triggering matching cycle...");
    await runMatchingCycle();
  });
  console.log("[Scheduler] Matching scheduler started (runs Friday at 3:30 AM).");
}
