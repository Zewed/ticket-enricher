import { logger } from "../config/logger.js";
import { enrichTicket } from "./aiEnricher.js";
import { gatherContext, type EnrichmentContext } from "./contextGatherer.js";
import { getIssue, postComment, updateIssue } from "./linearClient.js";

function buildSourcesFooter(context: EnrichmentContext): string {
  const lines: string[] = [];

  if (context.org) {
    lines.push(`- GitHub: \`${context.org}\``);
  }

  if (context.similarIssues.length > 0) {
    const tickets = context.similarIssues.map((i) => i.identifier).join(", ");
    lines.push(`- Linear: ${tickets}`);
  }

  if (lines.length === 0) return "";

  return `\n\n---\n*Sources used for enrichment:*\n${lines.join("\n")}`;
}

export async function runEnrichment(issueId: string, withFeedback = false): Promise<void> {
  if (withFeedback) {
    await postComment(issueId, "Enrichment in progress...");
  }

  try {
    const issue = await getIssue(issueId);
    logger.info({ identifier: issue.identifier }, "Issue fetched, gathering context");

    const context = await gatherContext(issue);
    logger.info({ identifier: issue.identifier }, "Context gathered, generating enrichment");

    const enriched = await enrichTicket(issue, context);
    enriched.description += buildSourcesFooter(context);
    logger.info({ identifier: issue.identifier }, "Enrichment generated, updating issue");

    await updateIssue(issue.id, enriched);
    logger.info({ identifier: issue.identifier }, "Enrichment complete");

    if (withFeedback) {
      await postComment(issueId, "Enrichment complete — title and description updated.");
    }
  } catch (err) {
    if (withFeedback) {
      await postComment(issueId, "Enrichment failed. Check the logs for details.").catch(() => {});
    }
    throw err;
  }
}
