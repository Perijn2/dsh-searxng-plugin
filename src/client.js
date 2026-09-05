/**
 * @module client
 * @author Perijn Huijser
 * Adds the browser card for the dsh-searxng settings namespace.
 *
 * @remarks
 * Includes:
 *   - apply: registers the SearXNG card in Settings → Plugins.
 *
 * Usage:
 *   // DSH loads this client entry for the web-searxng Cordis row.
 */

window.__ModuleLoader__.load({
  id: "dsh-searxng",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require("react");
    const SETTINGS_NAMESPACE = "web-searxng";
    const RECOMMENDED_DEFAULTS = {
      baseURL: "http://127.0.0.1:8888",
      language: "en",
      categories: "general",
      engines: "google,duckduckgo",
      safesearch: 1,
      timeoutMs: 10_000,
    };

    const inject = ["slots", "settingsScope"];

    /**
     * Register a writable SearXNG settings card in the shared Plugins section.
     *
     * @param ctx - DSH browser context with the slots and settings-scope services.
     * @example
     * apply(ctx);
     */
    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: SETTINGS_NAMESPACE,
        inject: () => ({ scope }),
      }, SearxngSettingsCard));
    }

    function SearxngSettingsCard({ scope }) {
      const snapshot = React.useSyncExternalStore(
        (listener) => scope.subscribe(listener),
        () => scope.getSnapshot(),
        () => scope.getSnapshot(),
      );
      const [error, setError] = React.useState("");
      const [open, setOpen] = React.useState(false);
      if (snapshot.status !== "ready" || snapshot.value === undefined) return null;

      const settings = { ...RECOMMENDED_DEFAULTS, ...snapshot.value };
      const write = (field, value) => {
        setError("");
        const operation = value === "" ? scope.unset(field) : scope.set(field, value);
        operation.catch((reason) => setError(`Unable to save ${field}: ${String(reason)}`));
      };
      const input = (label, field, type = "text", hint = undefined) => React.createElement(
        "label",
        { style: styles.field },
        React.createElement("span", { style: styles.label }, label),
        React.createElement("input", {
          type,
          defaultValue: settings[field] ?? "",
          disabled: !snapshot.writable,
          onChange: (event) => write(field, type === "number" ? Number(event.target.value) : event.target.value),
          style: styles.input,
        }),
        hint === undefined ? null : React.createElement("span", { style: styles.hint }, hint),
      );

      return React.createElement(
        "li",
        { style: styles.card },
        React.createElement(
          "button",
          {
            type: "button",
            style: styles.header,
            "aria-expanded": open,
            "aria-label": `${open ? "Collapse" : "Expand"}: SearXNG`,
            onClick: () => setOpen(!open),
          },
          React.createElement(
            "span",
            { style: styles.headerText },
            React.createElement("span", { style: styles.title }, "SearXNG"),
            React.createElement("span", { style: styles.description }, "Endpoint and search defaults for the self-hosted web-search provider."),
          ),
          React.createElement("span", { style: styles.chevron }, open ? "⌃" : "⌄"),
        ),
        !open ? null : React.createElement(
          "div",
          { style: styles.body },
          input("Base URL", "baseURL", "url", "Recommended default: http://127.0.0.1:8888"),
          input("Language", "language", "text", "Recommended default: en"),
          input("Categories", "categories", "text", "Recommended default: general. Use commas for more categories."),
          input("Engines", "engines", "text", "Recommended default: google,duckduckgo. Use commas for more engines."),
          selectField("Time range", "timeRange", settings.timeRange, [
            { value: "", label: "Any time" },
            { value: "day", label: "Past day" },
            { value: "week", label: "Past week" },
            { value: "month", label: "Past month" },
            { value: "year", label: "Past year" },
          ], scope, snapshot.writable, setError),
          selectField("Safe search", "safesearch", settings.safesearch, [
            { value: "0", label: "Off" },
            { value: "1", label: "Moderate (recommended)" },
            { value: "2", label: "Strict" },
          ], scope, snapshot.writable, setError),
          input("Timeout (ms)", "timeoutMs", "number", "Recommended default: 10000 ms."),
          input("Credential environment variable", "apiKeyEnv", "text", "Optional; the value is resolved by DSH and never displayed here."),
          error === "" ? null : React.createElement("p", { role: "alert", style: styles.error }, error),
          !snapshot.writable ? React.createElement("p", { style: styles.hint }, "This settings source is read-only.") : null,
        ),
      );
    }

    function selectField(label, field, current, options, scope, writable, setError) {
      return React.createElement(
        "label",
        { style: styles.field },
        React.createElement("span", { style: styles.label }, label),
        React.createElement(
          "select",
          {
            value: current === undefined ? "" : String(current),
            disabled: !writable,
            onChange: (event) => {
              const value = event.target.value;
              const operation = value === "" ? scope.unset(field) : scope.set(field, field === "safesearch" ? Number(value) : value);
              operation.catch((reason) => setError(`Unable to save ${field}: ${String(reason)}`));
            },
            style: styles.input,
          },
          options.map((option) => React.createElement("option", { key: option.value, value: option.value }, option.label)),
        ),
      );
    }

    const styles = {
      card: { listStyle: "none", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "10px", background: "var(--dsw-alias-bg-layer-2)", overflow: "hidden" },
      header: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 18px", border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", textAlign: "left" },
      headerText: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
      title: { color: "var(--dsw-alias-label-primary)", fontSize: "16px", fontWeight: 600 },
      description: { color: "var(--dsw-alias-label-tertiary)", fontSize: "13px" },
      chevron: { color: "var(--dsw-alias-label-tertiary)", fontSize: "18px", lineHeight: 1 },
      body: { padding: "0 18px 16px" },
      field: { display: "flex", flexDirection: "column", gap: "6px", padding: "10px 0", borderTop: "1px solid var(--dsw-alias-border-l2)" },
      label: { color: "var(--dsw-alias-label-primary)", fontSize: "13px", fontWeight: 500 },
      input: { height: "34px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "8px", padding: "0 10px", color: "var(--dsw-alias-label-primary)", background: "var(--dsw-alias-bg-layer-3)", font: "inherit" },
      hint: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px" },
      error: { color: "var(--dsw-alias-label-error)", fontSize: "12px" },
    };

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
