import express, { type ErrorRequestHandler } from "express";
import { pinoHttp } from "pino-http";

import { logger } from "./config/logger.js";
import { enrichRouter } from "./routes/enrich.js";
import { healthRouter } from "./routes/health.js";
import { linearWebhookRouter } from "./routes/linearWebhook.js";

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(enrichRouter);
  app.use(linearWebhookRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    logger.error(err, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
