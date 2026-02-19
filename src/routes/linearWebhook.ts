import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { runEnrichment } from "../services/enrichmentPipeline.js";

export const linearWebhookRouter = Router();

function isValidSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.LINEAR_WEBHOOK_SECRET || !signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", env.LINEAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

linearWebhookRouter.post("/webhooks/linear", (req, res) => {
  const signature = req.header("linear-signature");
  const rawBody = JSON.stringify(req.body ?? {});

  if (env.LINEAR_WEBHOOK_SECRET && !isValidSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid Linear signature" });
    return;
  }

  const { type, action, data } = req.body ?? {};

  res.status(202).json({ accepted: true });

  if (type === "Comment" && action === "create") {
    const body: string = data?.body ?? "";
    const issueId: string | undefined = data?.issueId;

    if (body.trim().startsWith("/enrich") && issueId) {
      logger.info({ issueId }, "Enrichment triggered via /enrich comment");
      runEnrichment(issueId).catch((err) => {
        logger.error({ err, issueId }, "Enrichment from comment failed");
      });
    }
  }
});
