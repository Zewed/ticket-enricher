import { logger } from "../config/logger.js";
import { enrichTicket } from "./aiEnricher.js";
import { getIssue, postComment } from "./linearClient.js";

export async function runEnrichment(issueId: string): Promise<void> {
  const issue = await getIssue(issueId);
  logger.info({ identifier: issue.identifier }, "Issue fetched, generating enrichment");

  const enrichedContent = await enrichTicket(issue);
  logger.info({ identifier: issue.identifier }, "Enrichment generated, posting comment");

  await postComment(issue.id, enrichedContent);
  logger.info({ identifier: issue.identifier }, "Enrichment complete");
}
