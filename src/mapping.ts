/**
 * @module mapping
 * @author Perijn Huijser
 * Validates SearXNG JSON results and maps them to the DSH web-search vocabulary.
 *
 * @remarks
 * Includes:
 *   - mapSearxngResponse: convert an untrusted SearXNG payload to citeable sources.
 *
 * Usage:
 *   import { mapSearxngResponse } from "./mapping.js";
 *   const result = mapSearxngResponse({ results: [{ url: "https://example.com" }] });
 */

import type { WebSearchResult, WebSearchSource } from "@deepseek-ai/dsh-web";
import type { SearxngSearchResponse, SearxngSearchResult } from "./types.js";

/**
 * Convert an untrusted SearXNG JSON payload to a normalized search result.
 *
 * @param payload - The parsed JSON body returned by SearXNG.
 * @returns Citeable, de-duplicated sources; malformed entries are omitted.
 *
 * @example
 * const result = mapSearxngResponse({ results: [{ url: "https://example.com", title: "Example" }] });
 */
export function mapSearxngResponse(payload: unknown): WebSearchResult {
  if (!isResponse(payload)) {
    throw new TypeError("SearXNG returned a response without a results array");
  }

  const seen = new Set<string>();
  const sources: WebSearchSource[] = [];
  for (const item of payload.results) {
    const source = mapResult(item);
    if (source !== undefined && !seen.has(source.url)) {
      seen.add(source.url);
      sources.push(source);
    }
  }

  return { sources, truncated: false };
}

function isResponse(value: unknown): value is Required<SearxngSearchResponse> {
  return typeof value === "object" && value !== null && Array.isArray((value as SearxngSearchResponse).results);
}

function mapResult(item: SearxngSearchResult): WebSearchSource | undefined {
  if (typeof item.url !== "string" || !isHttpUrl(item.url)) return undefined;

  return {
    url: item.url,
    ...(nonEmptyString(item.title) === undefined ? {} : { title: nonEmptyString(item.title) }),
    ...(nonEmptyString(item.content) === undefined ? {} : { snippet: nonEmptyString(item.content) }),
    ...(nonEmptyString(item.publishedDate) === undefined ? {} : { publishedAt: nonEmptyString(item.publishedDate) }),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
