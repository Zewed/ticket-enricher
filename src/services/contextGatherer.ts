import { logger } from "../config/logger.js";
import { searchRelevantCode, type CodeSnippet } from "./githubClient.js";
import {
  searchSimilarIssues,
  type IssueData,
  type SimilarIssue,
} from "./linearClient.js";

export interface EnrichmentContext {
  similarIssues: SimilarIssue[];
  codeSnippets: CodeSnippet[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "and", "but", "or", "not", "so", "yet", "this",
  "that", "these", "those", "it", "its", "we", "they", "le", "la",
  "les", "un", "une", "des", "de", "du", "et", "en", "est", "que",
  "qui", "dans", "pour", "sur", "avec", "par", "pas", "plus", "ce",
  "cette", "ces", "son", "sa", "ses",
]);

function extractKeywords(issue: IssueData): string[] {
  const parts: string[] = [issue.title, ...issue.labels];
  if (issue.description) {
    parts.push(issue.description.slice(0, 200));
  }

  const words = parts
    .join(" ")
    .toLowerCase()
    .split(/[\s\-_/.,;:!?()\[\]{}"'`]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  return [...new Set(words)];
}

export async function gatherContext(issue: IssueData): Promise<EnrichmentContext> {
  const searchQuery = `${issue.title} ${issue.labels.join(" ")}`.trim();
  const keywords = extractKeywords(issue);

  logger.debug(
    { identifier: issue.identifier, keywordCount: keywords.length },
    "Gathering RAG context",
  );

  // Run searches in parallel — each is fail-safe
  const [similarIssues, codeSnippets] = await Promise.all([
    searchSimilarIssues(searchQuery, {
      teamId: issue.teamId,
      maxResults: 5,
    }).catch((err) => {
      logger.warn({ err }, "Similar issue search failed");
      return [] as SimilarIssue[];
    }),
    searchRelevantCode(keywords, 3).catch((err) => {
      logger.warn({ err }, "Code search failed");
      return [] as CodeSnippet[];
    }),
  ]);

  const repos = [...new Set(codeSnippets.map((s) => s.repo))];

  logger.info(
    {
      identifier: issue.identifier,
      similarIssuesCount: similarIssues.length,
      codeSnippetsCount: codeSnippets.length,
      repos,
    },
    "RAG context gathered",
  );

  return { similarIssues, codeSnippets };
}
