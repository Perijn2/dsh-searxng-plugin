/**
 * @module index
 * @author Perijn Huijser
 * Registers a configurable SearXNG provider in the DeepSeek Harness web seam.
 *
 * @remarks
 * Includes:
 *   - name: the Cordis loader name.
 *   - inject: the required DSH web seam.
 *   - Config: plugin configuration schema.
 *   - apply: plugin entry point that installs settings and the provider.
 *
 * Usage:
 *   import { apply, Config } from "dsh-searxng";
 *   // Cordis calls apply(ctx, { baseURL: "http://127.0.0.1:8888" }) for the configured row.
 */

import type { Context } from "@deepseek-ai/cordis";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
import { SearxngSearchProvider } from "./provider.js";
import type { SearxngOptions } from "./types.js";

/** Cordis loader name used for diagnostics. */
export const name = "web-searxng";

/** The DSH web capability seam required by this plugin. */
export const inject = ["web"];

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_API_KEY_ENV = "DSH_SEARXNG_API_KEY";
const BASE_URL_ENV = "DSH_SEARXNG_BASE_URL";

/** Configuration accepted by the Cordis row and the `web-searxng` settings section. */
export interface Config {
  readonly baseURL?: string;
  readonly language?: string;
  readonly categories?: string;
  readonly engines?: string;
  readonly timeRange?: string;
  readonly safesearch?: number;
  readonly apiKeyEnv?: string;
  readonly timeoutMs?: number;
}

/** Runtime schema for SearXNG provider configuration. */
export const Config = z.object({
  baseURL: z.string(),
  language: z.string(),
  categories: z.string(),
  engines: z.string(),
  timeRange: z.string(),
  safesearch: z.number().step(1).min(0).max(2),
  apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
  timeoutMs: z.number().step(1).min(1).default(DEFAULT_TIMEOUT_MS),
});

/** Settings namespace that projects per-call SearXNG configuration. */
export const WEB_SEARXNG_SETTINGS_NAMESPACE = settingsNamespace("web-searxng");

/**
 * Register the SearXNG provider and project its settings section into each request.
 *
 * @param ctx - Cordis context that supplies the web seam and optional credential services.
 * @param config - Static row configuration used until user settings override it.
 * @returns Nothing; registration is owned by the caller's Cordis lifecycle.
 *
 * @example
 * apply(ctx, { baseURL: "http://127.0.0.1:8888" });
 */
export function apply(ctx: Context, config: Config): void {
  let current = (): Config => config;
  installSettingsSection(ctx, WEB_SEARXNG_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {},
  });
  ctx.web.registerSearchProvider(new SearxngSearchProvider(() => resolveOptions(ctx, current())));
}

function resolveOptions(ctx: Context, config: Config): SearxngOptions {
  const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV);
  return {
    baseURL: config.baseURL ?? launchEnvironmentOf(ctx).get(BASE_URL_ENV)?.value ?? "",
    language: config.language,
    categories: config.categories,
    engines: config.engines,
    timeRange: config.timeRange,
    safesearch: config.safesearch,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    resolveApiKey: async () => {
      const credentials = ctx.get("credentials");
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value;
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
      return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined;
    },
  };
}
