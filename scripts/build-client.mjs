/**
 * @module build-client
 * @author Perijn Huijser
 * Copies the prebundled DSH browser module into the published lib directory.
 *
 * @remarks
 * Includes:
 *   - buildClient: create the browser entry that DSH serves to Web clients.
 *
 * Usage:
 *   node scripts/build-client.mjs
 */

import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

/**
 * Copy the browser module after TypeScript has emitted the host plugin.
 *
 * @returns A promise fulfilled after `lib/browser-client.js` is written.
 * @example
 * await buildClient();
 */
export async function buildClient() {
  const outputDirectory = resolve(repositoryRoot, "lib");
  await mkdir(outputDirectory, { recursive: true });
  await cp(resolve(repositoryRoot, "src/client.js"), resolve(outputDirectory, "browser-client.js"));
}

await buildClient();
