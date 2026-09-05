/**
 * @module provider
 * @author Perijn Huijser
 * Implements the SearXNG-backed WebSearchProvider for the DSH web seam.
 *
 * @remarks
 * Includes:
 *   - SEARXNG_PROVIDER_ID: stable web-provider registration id.
 *   - SearxngSearchProvider: provider that resolves options for every search.
 *
 * Usage:
 *   import { SearxngSearchProvider } from "./provider.js";
 *   const provider = new SearxngSearchProvider(() => ({ baseURL: "http://127.0.0.1:8888", timeoutMs: 10_000 }));
 */

import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from "@deepseek-ai/dsh-web";
import { searchSearxng } from "./client.js";
import type { SearxngOptions } from "./types.js";

/** Stable id under which the provider registers in `ctx.web`. */
export const SEARXNG_PROVIDER_ID = "searxng";

/**
 * Serve DSH web searches through a dynamically configured SearXNG endpoint.
 *
 * @example
 * const provider = new SearxngSearchProvider(() => ({ baseURL: "http://127.0.0.1:8888", timeoutMs: 10_000 }));
 * const result = await provider.search({ query: "DeepSeek Harness" });
 */
export class SearxngSearchProvider implements WebSearchProvider {
  readonly id = SEARXNG_PROVIDER_ID;

  /** Create a provider that snapshots fresh settings at every operation. */
  constructor(private readonly resolveOptions: () => SearxngOptions) {}

  /** Report whether the currently resolved endpoint is a valid HTTP(S) URL. */
  available(): boolean {
    try {
      const url = new URL(this.resolveOptions().baseURL);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /** Run the request through SearXNG, forwarding DSH cancellation. */
  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions();
    const apiKey = options.apiKey ?? await options.resolveApiKey?.();
    return searchSearxng({ ...options, ...(apiKey === undefined ? {} : { apiKey }) }, request.query, signal);
  }
}
