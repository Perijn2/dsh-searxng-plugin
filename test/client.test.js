/**
 * @module client.test
 * @author Perijn Huijser
 * Verifies SearXNG request construction and upstream error handling.
 *
 * @remarks
 * Includes:
 *   - client tests: assert JSON query parameters and non-success response mapping.
 *
 * Usage:
 *   pnpm test
 */

import assert from "node:assert/strict";
import test from "node:test";
import { searchSearxng } from "../lib/client.js";

const options = { baseURL: "https://searxng.example/base/", timeoutMs: 10_000, language: "en", safesearch: 1 };

test("builds a JSON SearXNG request with supported options", async () => {
  const originalFetch = globalThis.fetch;
  let endpoint;
  globalThis.fetch = async (input) => {
    endpoint = new URL(input);
    return new Response(JSON.stringify({ results: [{ url: "https://example.com" }] }), { status: 200 });
  };

  try {
    const result = await searchSearxng(options, "DeepSeek Harness");
    assert.equal(endpoint.pathname, "/base/search");
    assert.equal(endpoint.searchParams.get("q"), "DeepSeek Harness");
    assert.equal(endpoint.searchParams.get("format"), "json");
    assert.equal(endpoint.searchParams.get("language"), "en");
    assert.equal(endpoint.searchParams.get("safesearch"), "1");
    assert.equal(result.sources.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a provider error for an upstream non-success response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("blocked", { status: 403 });

  try {
    await assert.rejects(searchSearxng(options, "test"), /HTTP 403/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
