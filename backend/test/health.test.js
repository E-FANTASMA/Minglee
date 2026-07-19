import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET ||= "test-jwt-secret";

const { createApp } = await import("../src/app.js");

test("GET /health returns a lightweight public health payload", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "healthy");
    assert.equal(typeof body.timestamp, "string");
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)), "timestamp should be ISO parseable");
    assert.equal(typeof body.uptime, "number");
    assert.ok(body.uptime >= 0, "uptime should be non-negative");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
