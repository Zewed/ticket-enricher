import { Octokit } from "@octokit/rest";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export interface CodeSnippet {
  path: string;
  content: string;
  matchReason: string;
}

let octokit: Octokit | null = null;
let cachedOrg: string | null | undefined;

function getClient(): Octokit | null {
  if (!env.GITHUB_TOKEN) return null;
  if (!octokit) {
    octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  }
  return octokit;
}

export async function getOrg(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  if (cachedOrg !== undefined) return cachedOrg;

  try {
    const orgs = await client.rest.orgs.listForAuthenticatedUser({ per_page: 1 });
    cachedOrg = orgs.data[0]?.login ?? null;
    if (cachedOrg) {
      logger.debug({ org: cachedOrg }, "Detected GitHub org");
    }
    return cachedOrg;
  } catch (err) {
    logger.warn({ err }, "Failed to detect GitHub org");
    cachedOrg = null;
    return null;
  }
}

export async function searchRelevantCode(
  keywords: string[],
  maxFiles = 3,
  maxContentLength = 2000,
): Promise<CodeSnippet[]> {
  const client = getClient();
  if (!client) return [];

  const org = await getOrg();
  if (!org) return [];

  const sanitized = keywords
    .slice(0, 3)
    .map((k) => k.replace(/[:"\\]/g, ""))
    .filter((k) => k.length > 0);
  if (sanitized.length === 0) return [];

  const query = sanitized.join(" ") + ` org:${org}`;

  try {
    const searchResult = await client.rest.search.code({
      q: query,
      per_page: maxFiles,
    });

    const filePromises = searchResult.data.items.slice(0, maxFiles).map(async (item) => {
      try {
        const repoFullName = item.repository.full_name;
        const [owner, repoName] = repoFullName.split("/");
        const fileResponse = await client.rest.repos.getContent({
          owner,
          repo: repoName,
          path: item.path,
        });

        if ("content" in fileResponse.data && fileResponse.data.content) {
          const decoded = Buffer.from(fileResponse.data.content, "base64").toString("utf-8");
          return {
            path: `${repoName}/${item.path}`,
            content: decoded.slice(0, maxContentLength),
            matchReason: `Matched: ${sanitized.join(", ")}`,
          };
        }
      } catch (err) {
        logger.debug({ path: item.path, err }, "Failed to fetch file from GitHub");
      }
      return null;
    });

    const results = await Promise.all(filePromises);
    const snippets = results.filter((r): r is CodeSnippet => r !== null);

    logger.debug({ count: snippets.length, org, keywords }, "Fetched code snippets from GitHub");
    return snippets;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 403 || status === 429) {
      logger.warn({ org }, "GitHub API rate limit hit, skipping code context");
    } else {
      logger.warn({ err, org, keywords }, "GitHub code search failed");
    }
    return [];
  }
}
