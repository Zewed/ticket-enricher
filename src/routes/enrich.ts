import { Router } from "express";

import { logger } from "../config/logger.js";
import { runEnrichment } from "../services/enrichmentPipeline.js";

export const enrichRouter = Router();

enrichRouter.post("/enrich/:issueId", async (req, res, next) => {
  const { issueId } = req.params;

  logger.info({ issueId }, "Enrichment requested");

  res.status(202).json({ status: "accepted", issueId });

  try {
    await runEnrichment(issueId);
  } catch (err) {
    logger.error({ err, issueId }, "Enrichment failed");
  }
});
