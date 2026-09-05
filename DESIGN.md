# Design: `dsh-searxng`

## Goal

Provide a server-side DeepSeek Harness Cordis plugin that makes the existing
model-facing `web_search` tool query a self-hosted SearXNG endpoint. It must
not fork or re-register `web_search`, alter its schema, prompt guidance, or UI,
or affect `web_fetch`.

The plugin joins the `ctx.web` provider registry as `searxng`; composition then
selects that provider by setting the web seam's `searchProvider` to `searxng`.

## Architecture

```text
model -> existing web_search tool -> ctx.web.search()
                                      |
                                      v
                           selected `searxng` provider
                                      |
                                      v
                    SearXNG JSON API: GET /search?format=json&q=...
                                      |
                                      v
                         normalized WebSearchResult[] -> tool UI/result
```

This is a host-only plugin. It needs no browser module because the existing
web tool and renderer remain the public interface.

## Repository layout

```text
dsh-searxng-plugin/
├── README.md                         # install and operational overview
├── DESIGN.md                         # this document
├── package.json                      # ESM package and DSH peer dependencies
├── tsconfig.json                     # emits src/ to lib/
├── src/
│   ├── index.ts                      # Cordis metadata, schema, settings registration
│   ├── provider.ts                   # provider registration and availability policy
│   ├── client.ts                     # URL construction, timeout, fetch, error mapping
│   ├── mapping.ts                    # SearXNG response validation and result mapping
│   └── types.ts                      # private SearXNG wire types and configuration
├── test/
│   ├── mapping.test.ts               # fixture-driven mapping and invalid-item cases
│   ├── client.test.ts                # URL/header/timeout/status behavior with mock fetch
│   ├── provider.test.ts              # seam registration and runtime settings projection
│   └── fixtures/
│       ├── results.json
│       └── malformed-results.json
├── config/
│   ├── cordis.patch.home.snippet.yml # global composition overlay
│   ├── cordis.patch.profile-web.snippet.yml
│   ├── settings.example.yaml         # non-secret client configuration
│   └── searxng.example.yaml          # server JSON-format example
└── .github/workflows/ci.yml          # typecheck, test, package smoke test
```

## Module responsibilities

### `src/index.ts`

Export the Cordis function plugin and declare `inject: ['web']`. Validate
static row configuration, register a `web-searxng` settings section, and create
the provider with access to the settings, launch-environment, and credentials
services. Static composition config is only a fallback; settings are resolved
for every request.

### `src/provider.ts`

Expose a provider with the stable id `searxng`. Its search method obtains the
current effective configuration, invokes the client, and returns the harness
search-result shape. `available()` is true only when a valid base URL can be
resolved. Do not silently fall back to the billed official provider: an invalid
or unavailable configured SearXNG endpoint should fail the requested search
with a clear, provider-qualified error.

### `src/client.ts`

Own all network boundary behavior:

- normalize a configured base URL and append `/search` safely;
- send `q` and `format=json`, plus supported optional parameters;
- apply a bounded request timeout using `AbortSignal`;
- accept JSON only, with a response-size limit if the runtime fetch adapter
  supports one;
- distinguish timeout, network failure, 401/403, 429, 5xx, malformed JSON, and
  invalid payload errors;
- never include an authorization value in logs or thrown errors.

Use `Authorization: Bearer …` only when an optional credential name resolves
to a value. The secret belongs in the credentials/environment layer, never in
YAML, test fixtures, or error output.

### `src/mapping.ts`

Treat SearXNG JSON as untrusted. For each valid result, map the canonical URL,
title, content/snippet, optional engine/category metadata, and optional
published date into the exact `ctx.web` result contract. Drop malformed entries
rather than failing a response that contains usable results. Preserve source
URLs so the existing tool UI can cite them. A valid response with no usable
items returns an empty result set.

## Configuration and precedence

The provider configuration is intentionally small:

```yaml
web-searxng:
  baseURL: http://127.0.0.1:8888
  language: en
  categories: general
  engines: duckduckgo
  timeRange: week
  safesearch: 1
  # apiKeyEnv: DSH_SEARXNG_API_KEY
```

For each call, resolve values in this order:

1. `web-searxng` user settings;
2. provider row config from the Cordis patch;
3. `DSH_SEARXNG_BASE_URL` for deployments that prefer environment setup;
4. provider defaults for non-sensitive query options.

Reject non-HTTP(S) URLs and trim a trailing slash. Do not support arbitrary
headers or arbitrary query parameters: those turn a search-provider plugin into
a general outbound-request proxy.

## Composition

A user installs the built package where DSH's loader can resolve
`dsh-searxng`, then applies exactly one supplied Cordis patch snippet. The
patch:

1. inserts `web-searxng` with `inject: [web]`;
2. changes the existing `web` row to `searchProvider: searxng`;
3. optionally disables `web-search-deepseek` to prevent accidental future
   ambiguity.

The explicit seam selection is the replacement mechanism. It preserves the
existing `tool-web` row and therefore preserves `web_search` and `web_fetch`.
Composition changes require a DSH restart; settings changes apply on the next
search if the settings service is projected per invocation.

## Failure semantics

| Condition | Outcome |
|---|---|
| Missing or invalid base URL | provider unavailable / configuration error |
| Request timeout or DNS/connect failure | retryable provider error |
| 401 or 403 | authentication or SearXNG JSON-format configuration error |
| 429 | rate-limit provider error |
| 5xx | upstream provider error |
| Invalid JSON or incompatible response | provider protocol error |
| Empty `results` | successful empty search |

Errors should identify `searxng`, provide a safe remediation hint, and retain
the original cause for local diagnostics without exposing credentials.

## Test plan

Unit tests cover query encoding, path joining, optional parameter omission,
authorization redaction, timeout cancellation, every response class above, and
mapping of normal, partial, empty, and malformed payloads. Provider tests use a
fake web registry to verify the id, registration lifecycle, and that settings
are re-read on successive calls.

A CI smoke test builds the package and imports `lib/index.js`. An optional
manual integration command targets a local SearXNG container with `formats:
[html, json]` and verifies that a real `web_search` result retains citations.

## Compatibility boundary

Pin peer-dependency support to the DSH release family whose `ctx.web` provider
contract is tested. Because this contract is internal to the harness, document
it as a compatibility boundary and run the provider test suite before widening
the supported DSH range. Avoid importing private implementation modules; depend
only on exported web, settings, credentials, launch-environment, Cordis, and
Schema APIs.

## Non-goals

- replacing or duplicating the `web_search` tool;
- modifying the browser GUI or tool-result card;
- changing `web_fetch`;
- managing a SearXNG server or its engine configuration;
- bypassing SearXNG access controls or accepting arbitrary outbound URLs.
