# walkerOS MCP — Design Vision

> The MCP is the **orchestrator and consultant** that helps users get the most
> out of walkerOS. It operates on structured data, bridges probabilistic AI to
> deterministic validation, and stays fully modular and vendor-agnostic.

## Core Positioning

**flow.json is the product.** Every tool, resource, and prompt exists to help
users author, validate, transform, and understand flow configurations. The MCP
never hardcodes vendor-specific workflows. Instead, it uses the structured data
in flow.json — and the metadata in packages — to guide users generically.

**The MCP is a platform, not a feature list.** New walkerOS features (consent
patterns, mapping operators, reference syntax) don't require new tools. They
slot into existing layers: resources teach concepts, prompts guide workflows,
tools execute operations, packages provide specifics.

## Architecture: Four Layers

```
Resources   →  teach concepts    (mapping, consent, variables, contracts)
Prompts     →  guide workflows   (add-step, setup-mapping, manage-contract)
Tools       →  execute operations (validate, simulate, bundle, push)
Packages    →  provide specifics  (hints, schemas, examples per step)
```

Each layer is independent. Adding a new destination package doesn't touch tools,
resources, or prompts. The package's `walkerOS.json` manifest (schemas, hints,
examples) integrates automatically via `package_get`.

## Design Principles

### 1. Modular and Vendor-Agnostic

No tool or prompt references specific vendors (GA4, Meta, etc.). Workflows
operate on generic concepts: "add a destination step," not "set up GA4." Package
hints provide vendor-specific guidance when the user selects a package.

### 2. Structured Data Over Free Text

flow.json is fully typed with JSON Schema support. Tools import core functions
(`resolveContracts`, `getFlowSettings`, `resolvePatterns`) for deterministic
operations. We bridge probabilistic AI to deterministic validation at every
opportunity — the AI generates, then `flow_validate` catches errors.

### 3. Separation of Concerns

- **Steps** (sources, destinations, transformers, stores) are the building
  blocks. Every component in a flow is a "step."
- **Mapping** transforms data between steps — same syntax everywhere.
- **Contracts** define schemas — same structure as mapping keys (entity.action
  with wildcards).
- **Variables and definitions** enable DRY config authoring.

### 4. Progressive Disclosure

Package details use sections (default → hints → examples → all). Resources
provide reference material without consuming tool calls. Prompts guide
multi-step workflows only when users trigger them.

### 5. Import Core Functions for Determinism

The MCP server imports and uses typed functions from `@walkeros/cli` and
`@walkeros/core`:

- `loadJsonConfig()` — resolve flow from path, URL, or API
- `getFlowSettings()` — resolve $var, $env, $def, $contract patterns
- `resolveContracts()` — process contract inheritance and wildcards
- `validate()` — deterministic schema validation
- `simulate()` — full pipeline simulation with mocked externals
- `fetchPackage()` — fetch package metadata from npm/jsdelivr

The AI suggests, the core functions verify. This is the fundamental pattern.

## Tool Inventory (10 tools)

| #   | Tool             | Purpose                                                                                                                                 | Annotations                     |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | `flow_load`      | Load existing flow (path/URL/API) or create new (web/server)                                                                            | readOnly                        |
| 2   | `flow_validate`  | Validate flows, events, mappings, contracts + package schema cross-checks                                                               | readOnly, idempotent            |
| 3   | `flow_bundle`    | Bundle flow config into deployable JS (local or remote)                                                                                 | openWorld                       |
| 4   | `flow_simulate`  | Simulate events through pipeline, summarized per-destination output                                                                     | readOnly, idempotent            |
| 5   | `flow_push`      | Push real events to actual destinations                                                                                                 | **destructive**, openWorld      |
| 6   | `flow_examples`  | List/inspect step examples from flow or packages                                                                                        | readOnly, idempotent            |
| 7   | `package_search` | Browse packages by type/platform or lookup specific package                                                                             | readOnly, idempotent            |
| 8   | `package_get`    | Fetch package details with progressive disclosure                                                                                       | readOnly, idempotent, openWorld |
| 9   | `api`            | Cloud gateway — projects, flows, deployments, auth. Single tool with `action` enum. Conditionally registered (requires WALKEROS_TOKEN). | varies by action                |

### Why 9 tools?

MCP best practice: 5-15 tools per server. 9 covers the full lifecycle while
leaving the LLM enough context window to reason about all of them. Every tool
description competes for attention — fewer tools means better tool selection.

### The `api` tool — unified cloud gateway

All cloud operations (17 previously separate tools) collapse into one tool with
an `action` enum:

```
api({ action: "whoami" })
api({ action: "project.list" })
api({ action: "flow.get", id: "cfg_..." })
api({ action: "flow.create", name: "my-flow", content: {...} })
api({ action: "deploy", id: "cfg_...", wait: true })
api({ action: "deployment.get", id: "cfg_..." })
```

**Why merge?** The API operations are infrastructure, not workflow. Users need
seamless flow from `flow_bundle` → `api({ action: "deploy" })`. Having these in
the same server eliminates context switching and reduces tool definitions from
26 to 10.

**Opt-out:** If `WALKEROS_TOKEN` is not set, the `api` tool is not registered.
Zero clutter for local-only users.

## Resource Inventory

Resources are passive reference data — available without tool calls.

| Resource        | URI                                | Content                                                                          |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Flow schema     | `walkeros://reference/flow-schema` | Annotated Flow.Config structure, connection rules, minimal example               |
| Event model     | `walkeros://reference/event-model` | Entity-action naming, event properties, minimal event structure                  |
| Mapping         | `walkeros://reference/mapping`     | data/map/loop/set/condition/consent/policy/fn/validate — the full mapping syntax |
| Consent         | `walkeros://reference/consent`     | Destination-level, rule-level, field-level consent; require; queue behavior      |
| Variables       | `walkeros://reference/variables`   | $var, $env, $def, $contract, $code, $store — all reference syntax                |
| Contract        | `walkeros://reference/contract`    | Named contracts, extends, wildcards, JSON Schema integration                     |
| API             | `walkeros://reference/api`         | OpenAPI spec for the walkerOS cloud API                                          |
| Packages        | `walkeros://reference/packages`    | Full registry catalog with types and platforms                                   |
| Package schemas | `walkeros://schema/{packageName}`  | Per-package JSON Schema (existing)                                               |

## Prompt Inventory

Prompts are user-triggered guided workflows (like slash commands).

| Prompt            | Purpose                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `add-step`        | Add a source/destination/transformer/store to a flow — guides package selection, config scaffolding, wiring (next/before chains) |
| `setup-mapping`   | Set up mapping for any step — teaches data/map/loop/set/condition, uses package examples as templates                            |
| `manage-contract` | Create/edit data contracts — can generate FROM existing mappings or generate mappings FROM contract                              |
| `use-definitions` | Extract repeated config into definitions + variables — DRY flow authoring                                                        |

### Prompts are modular, not vendor-specific

`add-step` doesn't know about GA4. It guides:

1. What type of step? (source/destination/transformer/store)
2. `package_search` to browse options
3. `package_get` to read schemas and hints
4. Scaffold the step config from package schemas
5. Wire into the flow (next/before chains, packages section)
6. `flow_validate` to verify

The package's hints provide vendor-specific guidance at step 3. The prompt stays
generic.

## Key Insights

### Contract <-> Mapping Bidirectionality

Both contracts and mappings use the same `entity.action` keying with `*`
wildcards. This enables:

**Contract -> Mapping:** "Your contract says `product.add` needs `id` and
`quantity`. Here's a mapping stub for any destination."

**Mapping -> Contract:** "Your 3 destinations all reference `data.id`,
`data.total`, `data.currency` from `order.complete`. Generated contract with
those as required."

This is a generic graph operation on the structured data in flow.json.

### The Variable and Definition Cascade

Resolution priority (highest to lowest):

1. Step-level `variables`/`definitions`
2. Settings-level `variables`/`definitions`
3. Config-level `variables`/`definitions`

The `use-definitions` prompt helps users DRY their config by extracting repeated
patterns into definitions and referencing them via `$def.name`.

### 100+ Features, Zero Tool Changes

flow.json has 100+ distinct features. None need dedicated tools — they slot into
existing layers:

1. **Documented in resources** (mapping reference, consent reference, etc.)
2. **Described in package hints** (per-step guidance from walkerOS.json)
3. **Validated by flow_validate** (schema-based, automatic)
4. **Simulated by flow_simulate** (runtime behavior, automatic)

Notable features that enrich the reference resources over time:

- **require** — defers step init until collector events fire (consent, session,
  user)
- **ingest** — source-level metadata extraction from raw requests (IP, headers)
- **primary** — marks which source's push function is exported as `elb`
- **policy** — pre-processing at config-level (all events) or rule-level (per
  event)
- **batch** — grouping events on mapping rules before delivery
- **inline code objects** — sources/destinations defined with type/push/init as
  `$code` strings
- **step examples** — stripped at bundle time (dev-only, never in production)
- **Three Type Zones** — the data flow pattern: arbitrary input → walkerOS event
  → arbitrary output

New features slot in without touching the tool surface.

### Response Design: Summaries, Hints, Actionable Errors

All tools return two layers:

1. **Content** — full JSON data via `mcpResult(result)` in `content[0].text`
2. **\_hints** — optional next-step guidance via
   `mcpResult(result, { next: [...] })`

Error responses include actionable hints:

```typescript
mcpError(error, 'Set WALKEROS_TOKEN env var or check token expiry');
```

This guides the LLM toward self-correction instead of generic failure messages.

### Tool Descriptions as Prompt Engineering

Tool descriptions are effectively system prompts for the LLM. They must:

- State WHEN to use the tool (not just what it does)
- Clarify boundaries between similar tools (validate vs simulate)
- Warn about side effects (flow_push is destructive, web platform limitations)
- Use MCP parameter syntax, not CLI flag syntax (no `--example`)

## Enhancement Patterns

### Adding a new walkerOS feature

1. Update core types (flow.ts, mapping.ts)
2. Add to relevant resource content (mapping reference, etc.)
3. Package hints mention the feature where relevant
4. `flow_validate` catches misuse automatically (schema-driven)
5. `flow_simulate` exercises it automatically (runtime-driven)

No MCP tool changes needed.

### Adding a new package

1. Publish to npm with `walkerOS.json` manifest (schemas, hints, examples)
2. Add to registry in `registry.ts`
3. `package_search` finds it, `package_get` returns its details
4. `add-step` prompt scaffolds config from its schemas

No other changes needed.

### Adding a new prompt

1. Create prompt handler that chains existing tools
2. Register in index.ts
3. The prompt uses resources for context + tools for execution

No tool changes needed.

## Technical Details

### Response Format

All tools use `mcpResult(result)` for success and `mcpError(error)` for
failures. The full typed response appears in both `content[0].text` (as JSON)
and `structuredContent`.

### Conditional Registration

```typescript
// API tool only registers when token is available
if (process.env.WALKEROS_TOKEN) {
  registerApiTool(server);
}
```

### Server Instructions

The `instructions` field in `McpServer` provides orientation:

- What walkerOS is (one sentence)
- Core architecture (Source -> Collector -> Destination)
- Recommended workflow (numbered steps using tool names)
- Key concepts (steps, mappings, env pattern, packages)

Instructions reference tool names and resource URIs, guiding the LLM's first
interaction.
