import { createApp } from "./app.js";
import { config } from "./config.js";
import { startMatchingScheduler } from "./jobs/matchingJob.js";
import { startKeepAliveJob } from "./jobs/keepAliveJob.js";

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
  
  // Start background schedulers
  startKeepAliveJob();
  startMatchingScheduler();
});
