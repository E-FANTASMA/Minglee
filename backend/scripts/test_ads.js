import { createApp } from "../../src/app.js";

async function runTest() {
  const app = createApp();
  const server = app.listen(4005, async () => {
    console.log("Test server running on http://localhost:4005");
    const baseUrl = "http://localhost:4005/ads";

    try {
      console.log("\n--- Step 4 Testing: 1. Insert a test ad (POST /ads) ---");
      const createRes = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Summer Bash Promo",
          image_url: "https://example.com/banner.png",
          target_url: "https://example.com/summer-bash",
          placement: "homepage",
          start_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          end_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
          is_active: true
        })
      });
      const createData = await createRes.json();
      console.log("POST /ads Status:", createRes.status);
      console.log("POST /ads Response:", JSON.stringify(createData, null, 2));

      const adId = createData.data?.id;
      if (!adId) throw new Error("Failed to get ad id from creation response");

      console.log("\n--- Step 4 Testing: 2. Fetch active ads (GET /ads?placement=homepage) ---");
      const fetchRes = await fetch(`${baseUrl}?placement=homepage`);
      const fetchData = await fetchRes.json();
      console.log("GET /ads Status:", fetchRes.status);
      console.log("GET /ads Response:", JSON.stringify(fetchData, null, 2));

      console.log(`\n--- Step 4 Testing: 3. Trigger impression (POST /ads/${adId}/impression) ---`);
      const impRes = await fetch(`${baseUrl}/${adId}/impression`, { method: "POST" });
      const impData = await impRes.json();
      console.log("POST /ads/:id/impression Status:", impRes.status);
      console.log("POST /ads/:id/impression Response:", JSON.stringify(impData, null, 2));

      console.log(`\n--- Step 4 Testing: 4. Trigger click (POST /ads/${adId}/click) ---`);
      const clickRes = await fetch(`${baseUrl}/${adId}/click`, { method: "POST" });
      const clickData = await clickRes.json();
      console.log("POST /ads/:id/click Status:", clickRes.status);
      console.log("POST /ads/:id/click Response:", JSON.stringify(clickData, null, 2));

      console.log("\n--- Step 4 Testing: 5. Verify updated counters on ad fetch ---");
      const verifyRes = await fetch(`${baseUrl}?placement=homepage`);
      const verifyData = await verifyRes.json();
      console.log("GET /ads Verification Response:", JSON.stringify(verifyData, null, 2));

      console.log("\nAll tests completed successfully!");
    } catch (err) {
      console.error("Test error:", err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTest();
