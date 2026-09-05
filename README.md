# dsh-searxng

A [DeepSeek Harness](https://www.npmjs.com/package/@deepseek-ai/dsh) plugin that
**replaces the default `web_search` provider** with a self-hosted
[SearXNG](https://docs.searxng.org) instance.

The harness's model-facing `web_search` tool is provider-neutral: it calls the
`ctx.web` capability seam, which selects a registered `WebSearchProvider` at
execution time. By default that provider is `deepseek-official`
(`@deepseek-ai/dsh-web-search-deepseek`, a billed API call per search). This
plugin registers a second provider, `searxng`, speaking the SearXNG JSON API
(`GET /search?q=...&format=json`) against your own instance — and a small
composition patch points the seam at it, so every `web_search` call from every
agent goes to SearXNG. The tool's schema, prompt guidance, and UI card are
untouched; `web_fetch` stays exactly as shipped.

## How it fits together

| Piece | Role |
|---|---|
| `src/` → `lib/index.js` | Cordis function plugin (`inject: ["web"]`): registers the `searxng` `WebSearchProvider` on `ctx.web`, installs a `web-searxng` settings section. |
| `config/cordis.patch.home.snippet.yml` | The replacement wiring: insert the provider row, set the seam's `searchProvider: searxng`, disable the shipped DeepSeek provider. |
| `config/settings.example.yaml` | Per-call `~/.dsh/settings.yaml` overrides (endpoint, engines, language, …) — no restart needed. |
| `config/searxng.example.yaml` | Minimal server-side SearXNG config (the JSON format is off by default — you must enable it). |

Full design, seam contract, implementation sketch, error semantics, and test
plan: [DESIGN.md](./DESIGN.md).

## Layout

```
dsh-searxng-plugin/
├── README.md                          # this file
├── DESIGN.md                          # complete design document
├── package.json                       # package identity + deps (ESM, type: module)
├── tsconfig.json                      # TypeScript build configuration
├── config/
│   ├── cordis.patch.home.snippet.yml      # append to ~/.dsh/cordis.patch.yml
│   ├── cordis.patch.profile-web.snippet.yml  # or: append to ~/.dsh/profiles/web/cordis.patch.yml
│   ├── settings.example.yaml              # merge into ~/.dsh/settings.yaml
│   └── searxng.example.yaml               # server-side SearXNG settings
├── src/
│   ├── index.ts                       # name / inject / Config / apply
│   ├── provider.ts                    # SearxngSearchProvider (id "searxng")
│   ├── client.ts                      # query building, fetch, error mapping
│   ├── client.js                      # browser Settings → Plugins card
│   ├── mapping.ts                     # SearXNG JSON → seam WebSearchResult
│   └── types.ts                       # private SearXNG wire and option types
├── scripts/
│   ├── build-client.mjs               # copies the browser module to lib/
│   └── install-web-profile.sh         # build and wire this checkout into ~/.dsh
└── test/
    ├── browser-client.test.js
    ├── mapping.test.js
    └── client.test.js
```

## Quick start (this machine's proven install path)

1. **Run SearXNG with JSON enabled** — see `config/searxng.example.yaml`:
   ```sh
   docker run -d --name searxng -p 8888:8080 \
     -v $(pwd)/config/searxng.example.yaml:/etc/searxng/settings.yml:ro \
     searxng/searxng:latest
   curl -s 'http://127.0.0.1:8888/search?q=test&format=json' | head
   ```
2. **Install into the web profile**:
   ```sh
   ./scripts/install-web-profile.sh
   ```
   The idempotent installer builds the package, links it as
   `~/.dsh/node_modules/dsh-searxng`, and applies the per-profile composition
   snippet at `~/.dsh/profiles/web/cordis.patch.yml`. Set `DSH_HOME` to target
   another DSH home. After restarting, configure it in **Settings → Plugins →
   Configurable** under **SearXNG**.
3. **Optionally configure requests** — merge `config/settings.example.yaml`
   into `~/.dsh/settings.yaml` to choose a different endpoint or SearXNG
   search parameters.
4. **Restart the dsh server** (`dsh --profile web`). From the next
   `web_search` on, results come from your SearXNG instance.

## Status

Implemented: the TypeScript provider, SearXNG client, response mapping, and
focused unit tests are present. Run `pnpm test` to compile and execute the
test suite.
