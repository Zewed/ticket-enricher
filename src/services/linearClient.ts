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
}

export async function getIssue(issueId: string): Promise<IssueData> {
  const issue = await client.issue(issueId);
  const [state, assignee, project, labels] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.project,
    issue.labels(),
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
  };
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
