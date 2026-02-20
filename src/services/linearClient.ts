import { LinearClient } from "@linear/sdk";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const client = new LinearClient({ apiKey: env.LINEAR_API_KEY });

export interface IssueData {
  id: string;
  identifier: string;
  title: string;
  description: string | undefined;
  state: string | undefined;
  labels: string[];
  assignee: string | undefined;
  project: string | undefined;
  teamId: string | undefined;
}

export async function getIssue(issueId: string): Promise<IssueData> {
  const issue = await client.issue(issueId);
  const [state, assignee, project, labels, team] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.project,
    issue.labels(),
    issue.team,
  ]);

  logger.debug({ issueId, identifier: issue.identifier }, "Fetched issue from Linear");

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? undefined,
    state: state?.name,
    labels: labels.nodes.map((l) => l.name),
    assignee: assignee?.displayName,
    project: project?.name,
    teamId: team?.id,
  };
}

export interface SimilarIssue {
  identifier: string;
  title: string;
  description: string | undefined;
  state: string | undefined;
}

export async function searchSimilarIssues(
  query: string,
  options?: { teamId?: string; maxResults?: number },
): Promise<SimilarIssue[]> {
  const max = options?.maxResults ?? 5;

  const keywordResults = await client.searchIssues(query, {
    first: max,
    ...(options?.teamId ? { teamId: options.teamId } : {}),
  });

  const results: SimilarIssue[] = [];

  for (const node of keywordResults.nodes) {
    const state = await node.state;
    results.push({
      identifier: node.identifier,
      title: node.title,
      description: node.description ?? undefined,
      state: state?.name,
    });
  }

  logger.debug({ count: results.length, query }, "Found similar issues");
  return results.slice(0, max);
}

export async function getRepoFromAttachments(issueId: string): Promise<string | null> {
  const issue = await client.issue(issueId);
  const attachments = await issue.attachments();

  for (const attachment of attachments.nodes) {
    const url = attachment.url;
    if (!url) continue;

    // Match GitHub URLs like https://github.com/owner/repo/...
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      logger.debug({ issueId, repo: match[1] }, "Detected GitHub repo from attachment");
      return match[1];
    }
  }

  return null;
}

export async function updateIssue(
  issueId: string,
  data: { title: string; description: string },
): Promise<void> {
  const payload = await client.updateIssue(issueId, {
    title: data.title,
    description: data.description,
  });

  if (!payload.success) {
    throw new Error(`Failed to update issue ${issueId}`);
  }

  logger.info({ issueId }, "Updated Linear issue title and description");
}

export async function postComment(issueId: string, body: string): Promise<void> {
  await client.createComment({ issueId, body });
  logger.debug({ issueId }, "Posted comment on Linear issue");
}
