/**
 * @module browser-client.test
 * @author Perijn Huijser
 * Verifies the browser entry registers a card for the SearXNG settings namespace.
 *
 * @remarks
 * Includes:
 *   - browser-client registration test: checks the Settings → Plugins slot key.
 *
 * Usage:
 *   pnpm test
 */

import assert from "node:assert/strict";
import test from "node:test";

test("registers a SearXNG settings card in the shared plugin slot", async () => {
  let moduleDefinition;
  globalThis.window = {
    __ModuleLoader__: {
      load(definition) {
        moduleDefinition = definition;
      },
    },
  };
  await import(`../lib/browser-client.js?test=${Date.now()}`);

  const exported = moduleDefinition.factory((name) => {
    assert.equal(name, "react");
    return {};
  });
  const registrations = [];
  const scope = {};
  exported.apply({
    settingsScope: { bind: () => scope },
    slots: {
      inject: (_name, registration) => registration(),
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      },
    },
  });

  assert.equal(moduleDefinition.id, "dsh-searxng");
  assert.deepEqual(exported.inject, ["slots", "settingsScope"]);
  assert.equal(registrations[0].options.name, "settings.plugin.item");
  assert.equal(registrations[0].options.key, "web-searxng");
});
