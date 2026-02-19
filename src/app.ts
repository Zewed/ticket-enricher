import express from "express";

import { healthRouter } from "./routes/health.js";
import { linearWebhookRouter } from "./routes/linearWebhook.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(healthRouter);
  app.use(linearWebhookRouter);

  return app;
}
