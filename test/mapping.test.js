/**
 * @module mapping.test
 * @author Perijn Huijser
 * Verifies normalization and validation of SearXNG search payloads.
 *
 * @remarks
 * Includes:
 *   - mapping tests: assert usable results are preserved and malformed ones are omitted.
 *
 * Usage:
 *   pnpm test
 */

import assert from "node:assert/strict";
import test from "node:test";
import { mapSearxngResponse } from "../lib/mapping.js";

test("maps usable sources and drops malformed or duplicate URLs", () => {
  const result = mapSearxngResponse({
    results: [
      { url: "https://example.com", title: "Example", content: "A snippet", publishedDate: "2026-01-01" },
      { url: "https://example.com", title: "Duplicate" },
      { url: "not-a-url", title: "Invalid" },
      { title: "Missing URL" },
    ],
  });

  assert.deepEqual(result, {
    sources: [{ url: "https://example.com", title: "Example", snippet: "A snippet", publishedAt: "2026-01-01" }],
    truncated: false,
  });
});

test("rejects a response without a results array", () => {
  assert.throws(() => mapSearxngResponse({}), /results array/u);
});
