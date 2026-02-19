import Anthropic from "@anthropic-ai/sdk";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { IssueData } from "./linearClient.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert engineering assistant that enriches development tickets.
Given a ticket's details, produce a concise markdown comment that helps the developer get started quickly.

Your comment must include:
- **Technical context**: what area of the codebase is likely involved
- **Implementation suggestions**: concrete steps or approach to solve the ticket
- **Clarification questions**: anything ambiguous that should be clarified before starting

Keep it short and actionable. Write in the same language as the ticket.`;

function buildUserPrompt(issue: IssueData): string {
  const parts = [
    `**Ticket**: ${issue.identifier} — ${issue.title}`,
    issue.description ? `**Description**:\n${issue.description}` : null,
    issue.state ? `**Status**: ${issue.state}` : null,
    issue.labels.length > 0 ? `**Labels**: ${issue.labels.join(", ")}` : null,
    issue.assignee ? `**Assignee**: ${issue.assignee}` : null,
    issue.project ? `**Project**: ${issue.project}` : null,
  ];

  return parts.filter(Boolean).join("\n\n");
}

export async function enrichTicket(issue: IssueData): Promise<string> {
  logger.debug({ identifier: issue.identifier }, "Calling Claude for enrichment");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(issue) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  logger.info(
    { identifier: issue.identifier, tokens: message.usage.output_tokens },
    "Enrichment generated",
  );

  return textBlock.text;
}
