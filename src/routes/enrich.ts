import { Router } from "express";

import { logger } from "../config/logger.js";
import { getIssue } from "../services/linearClient.js";

export const enrichRouter = Router();

enrichRouter.post("/enrich/:issueId", async (req, res, next) => {
  const { issueId } = req.params;

  logger.info({ issueId }, "Enrichment requested");

  res.status(202).json({ status: "accepted", issueId });

  try {
    const issue = await getIssue(issueId);
    logger.info({ issueId, identifier: issue.identifier }, "Enrichment pipeline started");

    // TODO: call enrichment pipeline (tickets 4 & 5)
  } catch (err) {
    logger.error({ err, issueId }, "Enrichment failed");
  }
});
