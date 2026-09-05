/**
 * @module client
 * @author Perijn Huijser
 * Performs bounded SearXNG JSON search requests and maps safe failures to WebError.
 *
 * @remarks
 * Includes:
 *   - searchSearxng: query a configured SearXNG endpoint.
 *
 * Usage:
 *   import { searchSearxng } from "./client.js";
 *   const result = await searchSearxng({ baseURL: "http://127.0.0.1:8888", timeoutMs: 10_000 }, "DeepSeek Harness");
 */

import { WebError, type WebSearchResult } from "@deepseek-ai/dsh-web";
import { mapSearxngResponse } from "./mapping.js";
import type { SearxngOptions } from "./types.js";

/**
 * Query SearXNG's JSON API with one provider configuration snapshot.
 *
 * @param options - The endpoint, request options, authentication, and timeout to use.
 * @param query - The user search query sent as SearXNG's `q` parameter.
 * @param signal - Optional caller cancellation signal.
 * @returns The normalized web-search result.
 * @throws {WebError} When the request is cancelled, fails, returns non-2xx, or has an invalid body.
 *
 * @example
 * const result = await searchSearxng({ baseURL: "http://127.0.0.1:8888", timeoutMs: 10_000 }, "SearXNG JSON API");
 */
export async function searchSearxng(
  options: SearxngOptions,
  query: string,
  signal?: AbortSignal,
): Promise<WebSearchResult> {
  const endpoint = searchEndpoint(options, query);
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const combinedSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        ...(options.apiKey === undefined ? {} : { authorization: `Bearer ${options.apiKey}` }),
      },
      redirect: "error",
      signal: combinedSignal,
    });
  } catch (error) {
    if (combinedSignal.aborted) {
      throw new WebError("SearXNG search aborted", "WEB_ABORTED", { cause: combinedSignal.reason });
    }
    throw new WebError("SearXNG search request failed", "WEB_PROVIDER_ERROR", { cause: error });
  }

  if (!response.ok) {
    throw new WebError(`SearXNG search returned HTTP ${response.status}`, "WEB_PROVIDER_ERROR");
  }

  try {
    return mapSearxngResponse(await response.json());
  } catch (error) {
    if (combinedSignal.aborted) {
      throw new WebError("SearXNG search aborted", "WEB_ABORTED", { cause: combinedSignal.reason });
    }
    if (error instanceof WebError) throw error;
    throw new WebError("SearXNG returned an unprocessable JSON response", "WEB_PROVIDER_ERROR", { cause: error });
  }
}

function searchEndpoint(options: SearxngOptions, query: string): URL {
  let base: URL;
  try {
    base = new URL(options.baseURL);
  } catch (error) {
    throw new WebError("SearXNG baseURL must be an absolute HTTP(S) URL", "WEB_PROVIDER_ERROR", { cause: error });
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") {
    throw new WebError("SearXNG baseURL must use HTTP or HTTPS", "WEB_PROVIDER_ERROR");
  }

  base.pathname = `${base.pathname.replace(/\/$/u, "")}/search`;
  base.search = "";
  base.searchParams.set("q", query);
  base.searchParams.set("format", "json");
  setOptional(base, "language", options.language);
  setOptional(base, "categories", options.categories);
  setOptional(base, "engines", options.engines);
  setOptional(base, "time_range", options.timeRange);
  if (options.safesearch !== undefined) base.searchParams.set("safesearch", String(options.safesearch));
  return base;
}

function setOptional(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value.trim().length > 0) url.searchParams.set(name, value);
}
