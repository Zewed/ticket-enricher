import { Octokit } from "@octokit/rest";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export interface CodeSnippet {
  path: string;
  content: string;
  matchReason: string;
}

let octokit: Octokit | null = null;

function getClient(): Octokit | null {
  if (!env.GITHUB_TOKEN) return null;
  if (!octokit) {
    octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  }
  return octokit;
}

export async function searchRelevantCode(
  repo: string,
  keywords: string[],
  maxFiles = 3,
  maxContentLength = 2000,
): Promise<CodeSnippet[]> {
  const client = getClient();
  if (!client) return [];

  const query =
    keywords.slice(0, 3).join(" ") + ` repo:${repo}`;

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) return [];

  try {
    const searchResult = await client.rest.search.code({
      q: query,
      per_page: maxFiles,
    });

    const filePromises = searchResult.data.items.slice(0, maxFiles).map(async (item) => {
      try {
        const fileResponse = await client.rest.repos.getContent({
          owner,
          repo: repoName,
          path: item.path,
        });

        if ("content" in fileResponse.data && fileResponse.data.content) {
          const decoded = Buffer.from(fileResponse.data.content, "base64").toString("utf-8");
          return {
            path: item.path,
            content: decoded.slice(0, maxContentLength),
            matchReason: `Matched: ${keywords.slice(0, 3).join(", ")}`,
          };
        }
      } catch (err) {
        logger.debug({ path: item.path, err }, "Failed to fetch file from GitHub");
      }
      return null;
    });

    const results = await Promise.all(filePromises);
    const snippets = results.filter((r): r is CodeSnippet => r !== null);

    logger.debug({ count: snippets.length, repo, keywords }, "Fetched code snippets from GitHub");
    return snippets;
  } catch (err) {
    logger.warn({ err, repo, keywords }, "GitHub code search failed");
    return [];
  }
}
