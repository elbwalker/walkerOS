---
name: walkeros-mcp-actions
description:
  Use when an AI agent calls walkerOS MCP tools from code (code execution / Code
  Mode, a Worker, or an app sandbox) to validate, simulate, bundle, or inspect
  flows and packages, and wants to filter large results in code instead of
  issuing many separate tool calls.
---

# Calling walkerOS MCP Tools from Code

## When to Use This Skill

You are an AI agent running inside a **code-execution host**, not issuing tool
calls one at a time through the model. Examples:

- Claude Code in code-execution / "Code Mode"
- a Cloudflare Worker or other serverless sandbox
- an app's server-side sandbox that binds the walkerOS MCP transport

The pattern: bind the MCP transport once, call only the tools you need from
code, **filter the verbose `structuredContent` payload in code**, and return
only the distilled answer to the model. This suppresses tokens that the model
never needs to see (full catalogs, per-destination simulation dumps) and avoids
a chain of one-by-one tool calls.

This is the "Code Execution with MCP" / "Code Mode" pattern: treat MCP tools as
functions you call in a sandbox, not as round-trips through the model context.

## The Seven Pure Tools

These walkerOS MCP tools are pure and composable: same input, same output, no
auth, no cloud side effects. Safe to call freely from code.

| Tool (fully-qualified)    | Purpose                                             | Verbose output worth filtering  |
| ------------------------- | --------------------------------------------------- | ------------------------------- |
| `walkeros:flow_validate`  | Validate a flow or step config; return issues       | small                           |
| `walkeros:flow_simulate`  | Run a flow against an event, mock destination calls | **yes** (per-destination calls) |
| `walkeros:flow_bundle`    | Bundle a flow config to a JS artifact               | medium (bundle/meta)            |
| `walkeros:flow_examples`  | Fetch canonical flow/step examples                  | **yes** (many examples)         |
| `walkeros:package_search` | Find packages by type/platform/keyword              | **yes** (catalog)               |
| `walkeros:package_get`    | Read a package's schemas, hints, examples           | **yes** (full schemas)          |
| `walkeros:diagnostics`    | Report MCP/CLI versions, app URL, reachability      | small                           |

To test an event against a flow, use `walkeros:flow_simulate`: it runs the event
through the flow with destination calls **mocked**, so nothing leaves the
sandbox. Do not use `walkeros:flow_push` for this (see below).

Always use the **fully-qualified `walkeros:<tool>`** name (Agent Skills
best-practice) so the call is unambiguous when multiple MCP servers are bound.

### Out of scope for this pattern

The eight cloud/auth/side-effect tools (`walkeros:auth`,
`walkeros:project_manage`, `walkeros:flow_manage`, `walkeros:deploy_manage`,
`walkeros:secret_manage`, `walkeros:feedback`, `walkeros:flow_load`,
`walkeros:flow_push`) carry authentication, cloud state, or side effects.
`walkeros:flow_push` in particular sends a **real event to real destinations**
(real API calls to live endpoints), so calling it "freely" would produce real,
duplicated sends; use `walkeros:flow_simulate` to test without sending. Do
**not** drive these tools from this code-execution filtering pattern; they
belong in an interactive, authorized session.

## The Recommended Pattern

1. **Bind the transport once.** Connect to the walkerOS MCP server at the top of
   your script, reuse the client for every call.
2. **Call only the tools you need.** Don't enumerate; pick the minimal set.
3. **Read `structuredContent`.** Every tool returns an MCP envelope; the typed
   payload lives in `structuredContent` (the `content` text block is for
   humans).
4. **Filter in code.** Reduce verbose payloads to the few fields that answer the
   question.
5. **Return the distilled answer.** Hand the model one line, not the full dump.

```ts
// Pseudo-code in a code-execution host. `mcp` is the bound walkerOS client.
// (Typed `@walkeros/mcp-actions` wrappers are planned/forthcoming; until then
//  call the raw tools and read `structuredContent` yourself.)

const flow = await readFile('flow.json', 'utf8');

// 1. Validate first; bail with one line if the config is broken.
const v = await mcp.call('walkeros:flow_validate', {
  type: 'flow',
  input: flow,
});
if (!v.structuredContent.valid) {
  return `invalid flow: ${v.structuredContent.errors.length} error(s)`;
}

// 2. Simulate one event through the flow; output is verbose (every destination).
const sim = await mcp.call('walkeros:flow_simulate', {
  configPath: 'flow.json',
  event: 'product add',
});

// 3. Filter in code: keep only destinations that failed. The model never sees
//    the full per-destination call dump, only the distilled verdict.
const failed = Object.entries(sim.structuredContent.destinations)
  .filter(([, d]) => !d.received)
  .map(([name]) => name);

// 4. Return one line.
return failed.length
  ? `simulate failed for: ${failed.join(', ')}`
  : 'simulate ok for all destinations';
```

The same shape applies to `walkeros:package_search` / `walkeros:package_get`
(filter a catalog or a schema down to the one field the user asked about) and
`walkeros:flow_examples` (pick the one matching example).

## Responsibility Boundary

PII handling, secret redaction, and sandbox isolation are the **execution
host's** responsibility, not walkerOS's: walkerOS MCP tools are pure functions
over the config and event you pass them.

## Related Skills

- [walkeros-using-cli](../walkeros-using-cli/SKILL.md) - The validate / simulate
  / bundle verbs these tools wrap
- [walkeros-understanding-flow](../walkeros-understanding-flow/SKILL.md) - Flow
  architecture you are validating and simulating
- [walkeros-mapping-configuration](../walkeros-mapping-configuration/SKILL.md) -
  Mapping recipes for the configs you inspect with `package_get`
