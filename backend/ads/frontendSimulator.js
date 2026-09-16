import { createApp } from "../../src/app.js";

const PORT = 4005;
const BASE_URL = `http://localhost:${PORT}/ads`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureSeedAd() {
  const checkRes = await fetch(`${BASE_URL}?placement=homepage`);
  const checkData = await checkRes.json();

  if (checkData.success && checkData.data && checkData.data.length > 0) {
    console.log(`[Frontend Simulator] Seed ad already exists (${checkData.data.length} homepage ad(s) found).`);
    return;
  }

  console.log("[Frontend Simulator] Creating initial test ad for homepage...");
  const createRes = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Spring Special Discount",
      image_url: "https://example.com/ads/spring-sale.png",
      target_url: "https://example.com/deals/spring",
      placement: "homepage",
      start_date: new Date(Date.now() - 60000).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      is_active: true
    })
  });
  const createData = await createRes.json();
  console.log("[Frontend Simulator] Created seed ad:", createData.data?.id);
}

async function pollAndSimulate(cycleNumber) {
  console.log(`\n==================================================`);
  console.log(`[Frontend Simulator] Cycle #${cycleNumber} — Polling GET /ads?placement=homepage...`);
  console.log(`==================================================`);

  try {
    // Step 1 — Fetch Ads
    const fetchRes = await fetch(`${BASE_URL}?placement=homepage`);
    const fetchData = await fetchRes.json();

    console.log(`[API Log] GET /ads?placement=homepage Status ${fetchRes.status}:`, JSON.stringify(fetchData));

    if (!fetchData.success || !fetchData.data || fetchData.data.length === 0) {
      console.log("[Frontend Simulator] No active ads found for placement='homepage'.");
      return;
    }

    const ads = fetchData.data;

    for (const ad of ads) {
      // Step 2 — Display Logic
      console.log(`\n[Frontend Simulator] Displaying Ad:`);
      console.log(`  ID: ${ad.id}`);
      console.log(`  Title: ${ad.title}`);
      console.log(`  Placement: ${ad.placement}`);
      console.log(`  Image URL: ${ad.image_url}`);

      // Step 3 — Impression Tracking
      const impRes = await fetch(`${BASE_URL}/${ad.id}/impression`, { method: "POST" });
      const impData = await impRes.json();
      console.log(`[API Log] POST /ads/${ad.id}/impression Status ${impRes.status}`);

      if (impData.success) {
        console.log(`[Frontend Simulator] Impression recorded for Ad ID: ${ad.id}`);
        console.log(`  Current Total Impressions: ${impData.data.impressions}`);
      } else {
        console.error(`[Frontend Simulator] Failed to record impression:`, impData);
      }

      // Step 4 — Click Simulation (1 in 3 chance, forced on cycle 2 & 4 to guarantee demonstration)
      const shouldClick = (cycleNumber % 2 === 0) || Math.random() < 0.33;
      if (shouldClick) {
        const clickRes = await fetch(`${BASE_URL}/${ad.id}/click`, { method: "POST" });
        const clickData = await clickRes.json();
        console.log(`[API Log] POST /ads/${ad.id}/click Status ${clickRes.status}`);

        if (clickData.success) {
          console.log(`\n[Frontend Simulator] Ad CLICKED:`);
          console.log(`  ID: ${ad.id}`);
          console.log(`  Title: ${ad.title}`);
          console.log(`  Current Total Clicks: ${clickData.data.clicks}`);
        } else {
          console.error(`[Frontend Simulator] Failed to record click:`, clickData);
        }
      } else {
        console.log(`[Frontend Simulator] User viewed Ad ${ad.id} without clicking.`);
      }
    }
  } catch (err) {
    console.error("[Frontend Simulator] Error during poll and simulate cycle:", err);
  }
}

async function startSimulator() {
  const app = createApp();
  const server = app.listen(PORT, async () => {
    console.log(`[Frontend Simulator] Server listening on http://localhost:${PORT}`);

    try {
      await ensureSeedAd();

      // Step 5 — Repeat (run 4 cycles with 5 second polling interval)
      const totalCycles = 4;
      for (let i = 1; i <= totalCycles; i++) {
        await pollAndSimulate(i);
        if (i < totalCycles) {
          console.log(`\n[Frontend Simulator] Waiting 5 seconds before next poll...`);
          await delay(5000);
        }
      }

      console.log("\n==================================================");
      console.log("[Frontend Simulator] Simulation completed successfully!");
      console.log("==================================================");
    } catch (err) {
      console.error("[Frontend Simulator] Simulator run error:", err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

startSimulator();
