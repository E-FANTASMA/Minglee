import "../../src/env.js";
import { createApp } from "../../src/app.js";

async function runTest() {
  console.log("=================================================");
  console.log("  SUPABASE NOTIFICATIONS SYSTEM INTEGRATION TEST ");
  console.log("=================================================");

  // Start Express server on random port
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Express server running at ${baseUrl}\n`);

  try {
    // Step 3 Test Payload
    const testPayload = {
      user_id: "test-user",
      message: "Test notification from system"
    };

    console.log("--> 1. Executing POST /notifications with payload:", JSON.stringify(testPayload));

    const postRes = await fetch(`${baseUrl}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload)
    });

    const postData = await postRes.json();
    console.log("POST /notifications Status Code:", postRes.status);
    console.log("POST /notifications API Response:", JSON.stringify(postData, null, 2));

    if (postRes.status !== 201 || !postData.success) {
      throw new Error(`Insert failed: ${JSON.stringify(postData)}`);
    }

    const insertedId = postData.data.id;
    console.log(`\nSuccessfully inserted record ID: ${insertedId}`);

    console.log("\n--> 2. Executing GET /notifications?user_id=test-user");

    const getRes = await fetch(`${baseUrl}/notifications?user_id=test-user`, {
      method: "GET",
      headers: { "x-user-id": "test-user" }
    });

    const getData = await getRes.json();
    console.log("GET /notifications Status Code:", getRes.status);
    console.log("GET /notifications API Response:", JSON.stringify(getData, null, 2));

    if (getRes.status !== 200 || !getData.success) {
      throw new Error(`Fetch failed: ${JSON.stringify(getData)}`);
    }

    const records = getData.data.notifications;
    const match = records.find(r => r.user_id === "test-user" && r.message === "Test notification from system");

    if (!match) {
      throw new Error("Inserted test record was not found in GET response!");
    }

    console.log("\n=================================================");
    console.log("CONFIRMATION: Test notification record exists!");
    console.log("Record Details:", JSON.stringify(match, null, 2));
    console.log("=================================================");
  } catch (err) {
    console.error("\nTEST ERRORED:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTest();
