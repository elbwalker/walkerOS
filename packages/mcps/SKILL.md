# MCP Packages

Parent folder for all walkerOS MCP server packages.

## Architecture

The MCP is the **orchestrator and consultant** for walkerOS. Four layers:

```
Resources   →  teach concepts    (flow-schema, mapping, consent, variables, contracts)
Prompts     →  guide workflows   (add-step, setup-mapping, manage-contract, use-definitions)
Tools       →  execute operations (flow_validate, flow_simulate, flow_bundle, flow_push)
Packages    →  provide specifics  (hints, schemas, examples per step)
```

## Packages

| Package                                            | Purpose                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `mcp/` (`@walkeros/mcp`)                           | Main server: flow dev tools, reference resources, prompts, unified API |
| `source-browser/` (`@walkeros/mcp-source-browser`) | Tagging MCP server for source browser                                  |

## Tools (in `@walkeros/mcp`)

| Tool             | Description                                                                     |
| ---------------- | ------------------------------------------------------------------------------- |
| `flow_load`      | Load existing or create new flow configuration                                  |
| `flow_validate`  | Validate events, flows, mappings, or contracts                                  |
| `flow_bundle`    | Bundle flow into deployable JavaScript                                          |
| `flow_simulate`  | Simulate events through a flow (mocked API calls)                               |
| `flow_push`      | Push real events through a flow (real API calls)                                |
| `flow_examples`  | List step examples in a flow                                                    |
| `package_search` | Browse or look up walkerOS packages                                             |
| `package_get`    | Fetch package schemas, hints, and examples                                      |
| `auth`           | Device-code login/logout/status for walkerOS cloud                              |
| `project_manage` | Manage walkerOS projects (list/get/create/update/delete/set_default)            |
| `flow_manage`    | Manage flows and previews (list/get/create/update/delete/duplicate/preview\_\*) |
| `deploy_manage`  | Manage deployments (deploy/list/get/delete)                                     |

## Resources

| URI                                | Content                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `walkeros://reference/flow-schema` | Flow.Json structure and connection rules                    |
| `walkeros://reference/event-model` | Event naming, properties, auto-populated fields             |
| `walkeros://reference/mapping`     | Mapping syntax (data/map/loop/set/condition/consent/policy) |
| `walkeros://reference/consent`     | Consent model (destination/rule/field level)                |
| `walkeros://reference/variables`   | Variable patterns ($var/$env/$def/$code/$store)             |
| `walkeros://reference/contract`    | Event schemas, wildcards, inheritance                       |
| `walkeros://reference/openapi`     | OpenAPI 3.1 specification                                   |
| `walkeros://reference/packages`    | Full package catalog                                        |
| `walkeros://schema/{packageName}`  | Per-package JSON schemas                                    |

## Prompts

| Prompt            | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `add-step`        | Add a source/destination/transformer/store to a flow        |
| `setup-mapping`   | Configure event mapping for a step                          |
| `manage-contract` | Create/update event contracts (bidirectional with mappings) |
| `use-definitions` | Extract shared patterns into definitions and variables      |

## Networking

Outbound requests to a configured `WALKEROS_APP_URL` carry an
`X-Walkeros-Client: walkeros-mcp/{version}` header so the host can attribute
usage. No PII; the header is the only client identifier.

## Conventions

- Each package is registered in `walkerOS/package.json` workspaces
- Each package is registered in `.claude-plugin/plugin.json` mcpServers
- Shared MCP utility code (`mcpResult`/`mcpError`) lives in `@walkeros/core`
- Domain schemas are owned by each package, not shared between MCP servers
- Cross-package data access uses `@walkeros/cli` typed functions
- All tool responses use `mcpResult`/`mcpError` with summaries and `_hints`

## Adding a New MCP Package

1. Create `packages/mcp/<name>/` with package.json, tsup, jest, tsconfig
2. Add to monorepo workspaces in `walkerOS/package.json`
3. Add to `.claude-plugin/plugin.json` mcpServers
4. Use `mcpResult`/`mcpError` from `@walkeros/core` for response formatting
5. Follow existing package patterns for tool registration, annotations, and
   output schemas
