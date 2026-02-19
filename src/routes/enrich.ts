import { Router } from "express";

import { logger } from "../config/logger.js";
import { runEnrichment } from "../services/enrichmentPipeline.js";

export const enrichRouter = Router();

enrichRouter.post("/enrich/:issueId", async (req, res) => {
  const { issueId } = req.params;

  logger.info({ issueId }, "Enrichment requested");

  try {
    await runEnrichment(issueId);
    res.status(200).json({ status: "completed", issueId });
  } catch (err) {
    logger.error({ err, issueId }, "Enrichment failed");
    res.status(500).json({ status: "error", issueId });
  }
});
