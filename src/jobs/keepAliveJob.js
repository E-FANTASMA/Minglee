import cron from "node-cron";
import http from "node:http";
import https from "node:https";
import { config } from "../config.js";
import "../env.js";

/**
 * Keep-Alive Cronjob
 * 
 * Free-tier hosting platforms (such as Render, Koyeb, etc.) spin down or put instances
 * to sleep after 15 minutes of inactivity. This scheduler runs every 10 minutes
 * to ping the health endpoint, generating incoming traffic and keeping the backend awake.
 */

function pingUrl(targetUrl) {
  return new Promise((resolve) => {
    try {
      const url = new URL(targetUrl);
      const client = url.protocol === "https:" ? https : http;

      const req = client.get(
        targetUrl,
        {
          headers: {
            "User-Agent": "Minglee-Backend-KeepAlive/1.0",
          },
          timeout: 10000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve({ ok: res.statusCode === 200, status: res.statusCode });
          });
        }
      );

      req.on("error", (err) => {
        resolve({ ok: false, error: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Ping timed out" });
      });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

export function startKeepAliveJob() {
  const externalUrl =
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.API_URL;

  const pingTargets = [];

  if (externalUrl) {
    const formatted = externalUrl.replace(/\/$/, "");
    pingTargets.push(formatted.endsWith("/health") ? formatted : `${formatted}/health`);
  }

  // Also include local health check
  pingTargets.push(`http://127.0.0.1:${config.port}/health`);

  // Run every 10 minutes to prevent 15-minute inactivity idle sleep
  cron.schedule("*/10 * * * *", async () => {
    const timestamp = new Date().toISOString();
    for (const target of pingTargets) {
      const result = await pingUrl(target);
      if (result.ok) {
        console.log(`[KeepAlive] ${timestamp} - Successfully pinged ${target} (status: ${result.status})`);
      } else {
        console.warn(`[KeepAlive] ${timestamp} - Ping to ${target} failed: ${result.error || result.status}`);
      }
    }
  });

  console.log(`[KeepAlive] Backend keep-alive cronjob started (runs every 10 minutes). Targets: ${pingTargets.join(", ")}`);
}
