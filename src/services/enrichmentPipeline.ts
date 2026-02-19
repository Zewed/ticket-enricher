import { logger } from "../config/logger.js";
import { enrichTicket } from "./aiEnricher.js";
import { getIssue, updateIssue } from "./linearClient.js";

export async function runEnrichment(issueId: string): Promise<void> {
  const issue = await getIssue(issueId);
  logger.info({ identifier: issue.identifier }, "Issue fetched, generating enrichment");

  const enriched = await enrichTicket(issue);
  logger.info({ identifier: issue.identifier }, "Enrichment generated, updating issue");

  await updateIssue(issue.id, enriched);
  logger.info({ identifier: issue.identifier }, "Enrichment complete");
}
