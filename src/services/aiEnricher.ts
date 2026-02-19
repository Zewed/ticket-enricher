// eslint-disable-next-line @typescript-eslint/no-require-imports
import Anthropic from "@anthropic-ai/sdk";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { IssueData } from "./linearClient.js";

// @ts-ignore — CJS/ESM interop: local and Vercel resolve differently
const client = new (Anthropic.default ?? Anthropic)({ apiKey: env.ANTHROPIC_API_KEY });

export interface EnrichmentResult {
  title: string;
  description: string;
}

const SYSTEM_PROMPT = `You are an expert engineering assistant that enriches development tickets.
Given a ticket's details, produce an improved title and a rich markdown description that helps the developer get started quickly.

You must respond with a JSON object containing exactly two fields:
- "title": a clear, concise ticket title (keep it short, under 80 chars)
- "description": a rich markdown description that includes:
  - A summary of the task
  - Technical context: what area of the codebase is likely involved
  - Implementation suggestions: concrete steps or approach
  - Clarification questions: anything ambiguous that should be clarified

Keep it actionable. Write in the same language as the ticket.
Respond ONLY with the JSON object, no other text.`;

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

export async function enrichTicket(issue: IssueData): Promise<EnrichmentResult> {
  logger.debug({ identifier: issue.identifier }, "Calling Claude for enrichment");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(issue) }],
  });

  const textBlock = message.content.find((block: { type: string }) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  logger.info(
    { identifier: issue.identifier, tokens: message.usage.output_tokens },
    "Enrichment generated",
  );

  const raw = textBlock.text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  const parsed = JSON.parse(raw) as EnrichmentResult;

  if (!parsed.title || !parsed.description) {
    throw new Error("Invalid enrichment response: missing title or description");
  }

  return parsed;
}
