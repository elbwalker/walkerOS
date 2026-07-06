export const SERVER_INSTRUCTIONS = `walkerOS is an open-source, privacy-first event data collection platform. Define event pipelines as code using JSON flow configurations.

## Rules

- **Never guess package names.** Always use \`package_search\` first to find exact names, then \`package_get\` for details.
- **Never construct flow configs from memory.** Read \`walkeros://reference/flow-schema\` and use \`package_get\` for package-specific schemas.
- **Always validate.** Run \`flow_validate\` after every config change. If validation fails, fix and re-validate.
- **Simulate before deploying.** Use \`flow_simulate\` to test with mocked API calls before \`flow_bundle\` or \`flow_push\`.
- **When a request fails,** call \`diagnostics\` to see which MCP/CLI versions, app URL, and backend you are on, plus whether the app is reachable.

## Workflow

1. \`auth({ action: "status" })\` — check if logged in, or \`auth({ action: "login" })\` to connect
2. \`project_manage({ action: "list" })\` — see your projects
3. \`flow_manage({ action: "list" })\` — see all flows across projects
4. \`flow_load({ platform: "web" })\` or \`flow_load({ source: "./flow.json" })\` — create or load
5. \`package_search({ type: "destination", platform: "web" })\` — discover packages
6. \`package_get({ package: "..." })\` — read schemas, hints, examples
7. Use the \`add-step\` prompt — guided step addition
8. Use the \`setup-mapping\` prompt — event transformation config
9. \`flow_validate({ type: "flow", input: "flow.json" })\` — verify
10. \`flow_simulate({ configPath: "flow.json", event: "..." })\` — test
11. \`flow_manage({ action: "update", flowId: "...", content: {...} })\` — save to cloud
12. \`deploy_manage({ action: "deploy", flowId: "..." })\` — deploy

## Architecture: Source → Collector → Destination(s)

Every component in a flow is a **step**: sources capture events, transformers process them, destinations deliver them, stores provide shared state. Steps connect via \`next\` (pre-collector) and \`before\` (post-collector) chains.

## Flow Config Structure

\`\`\`json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": { "<name>": { "package": "<npm-package>", "config": {} } },
      "destinations": { "<name>": { "package": "<npm-package>", "config": { "settings": {} } } }
    }
  }
}
\`\`\`

- \`version: 4\` is required
- Each flow declares its target via \`config.platform\` (\`"web"\` or \`"server"\`)
- Destination settings go inside \`config.settings\`, not directly on the destination
- Event format: \`{ name: "entity action", data: {...}, entity: "...", action: "..." }\`

## Key Concepts

- **Mapping** transforms events using data/map/loop/set/condition rules. Same syntax on sources and destinations. Mapping rules use NESTED entity → action keying: event name "product add" maps to \`{ "product": { "add": Rule } }\`. Wildcards: \`{ "*": { "view": Rule } }\`.
- **Contracts** define event schemas using entity-action keying. Can generate FROM mappings or scaffold mappings FROM contracts.
- **Variables** (\$var, \$env, \$secret, \$code, \$store) enable DRY, environment-aware config. \`$var.name\` is a reusable flow variable from the top-level \`variables\` block; whole-string refs preserve native type (object/array/scalar), inline interpolation requires a scalar, deep paths via \`$var.name.deep.path\`. \`$env.NAME[:default]\` is an environment variable resolved at bundle/deploy time (non-secret config only). \`$secret.NAME\` is a managed secret the deploy pipeline injects into the server runner at runtime; credentials, tokens, and private keys must use \`$secret\`, not \`$env\`.
- **Consent** gates destinations, mapping rules, and individual fields. Privacy-first by design.
- **Routing** wires steps via \`next\` (pre-collector) and \`before\` (post-collector). A route is a string ID, a sequence (\`["a", "b"]\`), or a RouteConfig (\`{ match?, next }\` or \`{ match?, one: [...] }\`). The \`one\` operator dispatches first-match against an ordered list of branches. Use \`many\` (instead of \`one\`) when every matching entry should run as an independent parallel flow — restricted to pre-collector positions. The optional \`match\` field is omitted to mean always-match (no wildcard literal).
- **Pass-through steps** are transformer entries with no \`code\` and no \`package\`. The runtime synthesizes the push for them automatically. Three flavors share this shape: a \`before\` / \`next\`-only step (named hop reusable across destinations), a \`cache\`-only step (dedup, rate-limit), and a \`mapping\`-only step (declarative event-to-event transform). A pass-through must declare at least one of \`before\`, \`next\`, \`cache\`, or \`mapping\`.
- **Mapping at the transformer position** uses the same \`Mapping.Config\` shape as destinations, but the semantic is event-to-event: \`policy\` and per-rule \`policy\`, \`mapping[].name\` (rename), \`mapping[].ignore\` (drop from chain), \`consent\`, and \`include\` apply. Vendor-payload fields (\`data\`, \`silent\`, \`mapping[].data\`) are no-ops at this position.
- **Closed-schema rule on transformer entries:** known keys only. Operative keys are \`code\`, \`package\`, \`before\`, \`next\`, \`cache\`, \`mapping\`. Combined with structural keys (\`config\`, \`env\`, \`validate\`, \`disabled\`, \`id\`, etc.). Unknown top-level keys on a transformer step are errors (catches typos like \`dedup: {}\` instead of nested under \`cache\`). \`code\` + \`package\` together is a conflict.
- **Cache** memoizes step output on a configured store. Set \`cache.stop: true\` to short-circuit the chain on HIT (sources default to stop-on-HIT). Set \`cache.namespace\` to prefix keys; omit it to write keys directly. \`CacheRule.match\` is optional, omit for always-match.

## Simulation Tips

- Destinations with \`require: ["consent"]\` stay **pending** until a \`"walker consent"\` event fires. Simulation will error "not found" for pending destinations, remove \`require\` from config when testing with \`flow_simulate\`.
- Destinations with \`consent: { marketing: true }\` silently skip events that lack matching consent. Include \`consent\` in the event: \`{ name: "page view", data: {...}, consent: { marketing: true } }\`.
- **Mapping** transforms event names and data at the destination level. Events without a matching mapping rule pass through unmodified.
- **Policy** modifies the event before mapping runs, use it to inject computed fields or redact sensitive data.

## Reference Resources

Read these before constructing configs manually: \`walkeros://reference/flow-schema\`, \`walkeros://reference/mapping\`, \`walkeros://reference/event-model\`, \`walkeros://reference/consent\`, \`walkeros://reference/variables\`, \`walkeros://reference/contract\`, \`walkeros://reference/examples\`.`;
