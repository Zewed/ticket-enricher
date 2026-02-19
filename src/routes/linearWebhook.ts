import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";

import { env } from "../config/env.js";

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

  // Placeholder: branch on event type and call enrichment pipeline.
  const eventType = req.body?.type ?? "unknown";
  const issueId = req.body?.data?.id ?? null;

  res.status(202).json({
    accepted: true,
    eventType,
    issueId
  });
});
