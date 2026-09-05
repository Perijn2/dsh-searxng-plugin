/**
 * @module types
 * @author Perijn Huijser
 * SearXNG wire-format and runtime-option types used by the provider.
 *
 * @remarks
 * Includes:
 *   - SearxngSearchResponse: the response fields consumed from SearXNG JSON.
 *   - SearxngSearchResult: one untrusted SearXNG result item.
 *   - SearxngOptions: the normalized configuration for one provider call.
 *
 * Usage:
 *   import type { SearxngOptions } from "./types.js";
 *   const options: SearxngOptions = { baseURL: "http://127.0.0.1:8888", timeoutMs: 10_000 };
 */

/** A SearXNG JSON search response whose fields are validated before use. */
export interface SearxngSearchResponse {
  readonly results?: readonly SearxngSearchResult[];
}

/** A potentially incomplete result item returned by SearXNG. */
export interface SearxngSearchResult {
  readonly url?: unknown;
  readonly title?: unknown;
  readonly content?: unknown;
  readonly publishedDate?: unknown;
}

/** The fully resolved configuration snapshot for one SearXNG request. */
export interface SearxngOptions {
  readonly baseURL: string;
  readonly language?: string;
  readonly categories?: string;
  readonly engines?: string;
  readonly timeRange?: string;
  readonly safesearch?: number;
  readonly apiKey?: string;
  readonly resolveApiKey?: () => Promise<string | undefined>;
  readonly timeoutMs: number;
}
