<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/mcp

Model Context Protocol server for walkerOS flow development. Gives an AI
assistant the tools to discover packages, build a flow configuration, validate
it, simulate events through it, bundle it, and deploy it.

[Documentation](https://www.walkeros.io/docs/apps/mcp) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/mcp) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/mcps/mcp)

## Installation

The server runs over stdio and is started by your MCP client. Add it to the
client's configuration:

```json
{
  "mcpServers": {
    "walkeros-flow": {
      "command": "npx",
      "args": ["@walkeros/mcp"]
    }
  }
}
```

| Client         | File                                                       |
| -------------- | ---------------------------------------------------------- |
| Claude Code    | `.mcp.json` in the project root                            |
| Cursor         | `.cursor/mcp.json` in the project root                     |
| Claude Desktop | `claude_desktop_config.json`                               |
| VS Code        | `.vscode/mcp.json`, with `servers` instead of `mcpServers` |

In Claude Code you can also install the walkerOS plugin, which registers this
server, the tagging server, and the walkerOS skills in one step:

```
/plugin marketplace add elbwalker/walkerOS
/plugin install walkeros@elbwalker
```

To install the binary directly instead of running it through `npx`:

```bash
npm install @walkeros/mcp
```

## No account required

The server starts, registers all tools, and runs the whole local loop without
any credentials. `auth` reports `{ "authenticated": false }` and the local tools
work regardless. Only the walkerOS cloud tools need a login, either through the
`auth` tool's device code flow or a `WALKEROS_TOKEN` environment variable.

## The core loop

Five tools cover building a flow from nothing to a tested configuration, and all
five run locally:

1. **`flow_load`** creates an empty flow for a platform, or loads an existing
   one from a file, URL, or inline JSON.
2. **`package_search`** finds the exact package names for the sources,
   destinations, transformers, and stores the flow needs. Never guess a package
   name, search for it.
3. **`package_get`** returns that package's configuration schema, hints, and
   worked examples, so the config is written against the real shape.
4. **`flow_validate`** checks the result. Fix and re-validate until it passes.
5. **`flow_simulate`** pushes an event through the flow with vendor calls mocked
   and shows what each step produced.

## Tools

The server registers 17 tools.

### Local, no account

| Tool             | Description                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| `flow_load`      | Load a flow from a file path, URL, inline JSON, or flow ID, or create an empty one |
| `flow_validate`  | Validate an event, flow config, mapping rule, or data contract                     |
| `flow_simulate`  | Run an event through a flow with mocked vendor calls and inspect each step         |
| `flow_bundle`    | Compile a flow into a tree-shaken, deployable JavaScript bundle                    |
| `flow_push`      | Push a real event through a flow to real destinations, making real API calls       |
| `flow_examples`  | List the step examples in a flow, the fixtures simulation can replay               |
| `package_search` | Find packages by name, type, or platform. The entry point for package discovery    |
| `package_get`    | Read one package's schemas, configuration hints, and examples by exact name        |
| `diagnostics`    | Report MCP and CLI versions, app URL, backend, and whether the app is reachable    |

### walkerOS cloud

| Tool               | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `auth`             | Check login status, log in through the device code flow, or log out                       |
| `project_manage`   | List, create, update, or delete projects, and set the default one                         |
| `flow_manage`      | List, create, update, delete, or duplicate saved flows, and manage their previews         |
| `deploy_manage`    | Deploy a flow and list, inspect, or delete its deployments                                |
| `secret_manage`    | Manage a flow's `$secret.<NAME>` values. Write-mostly, values are never returned          |
| `observe_session`  | Start, inspect, or stop an Observe session, a time-boxed window on one running flow       |
| `observe_journeys` | Read the assembled journeys for an observed flow, each event traced across web and server |
| `feedback`         | Send feedback about walkerOS                                                              |

## Resources

| URI                                | Content                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `walkeros://reference/flow-schema` | Flow configuration structure and connection rules               |
| `walkeros://reference/event-model` | Event naming, properties, and auto-populated fields             |
| `walkeros://reference/mapping`     | Mapping syntax: data, map, loop, set, condition, policy         |
| `walkeros://reference/consent`     | The consent model at destination, rule, and field level         |
| `walkeros://reference/variables`   | Variable patterns: `$var`, `$env`, `$secret`, `$code`, `$store` |
| `walkeros://reference/contract`    | Event schemas, wildcards, and inheritance                       |
| `walkeros://reference/openapi`     | OpenAPI 3.1 specification for the walkerOS API                  |
| `walkeros://reference/packages`    | The full package catalog                                        |
| `walkeros://schema/{packageName}`  | JSON schema for one package                                     |

Read these before writing a configuration by hand.

## Prompts

| Prompt            | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `add-step`        | Add a source, destination, transformer, or store to a flow         |
| `setup-mapping`   | Configure event mapping for a step                                 |
| `manage-contract` | Create or update event contracts, in both directions with mappings |

## Environment variables

| Variable              | Required | Default                   | Purpose                                               |
| --------------------- | -------- | ------------------------- | ----------------------------------------------------- |
| `WALKEROS_TOKEN`      | No       | none                      | Bearer token, an alternative to the `auth` tool login |
| `WALKEROS_PROJECT_ID` | No       | none                      | Active project ID (`proj_...`)                        |
| `WALKEROS_APP_URL`    | No       | `https://app.walkeros.io` | Base URL override                                     |

## Programmatic usage

The package exports a transport-agnostic server factory, so a host application
can mount the protocol over HTTP instead of running the stdio binary:

```typescript
import {
  createWalkerOSMcpServer,
  HttpToolClient,
  createStreamableHttpHandler,
} from '@walkeros/mcp';

const server = createWalkerOSMcpServer({
  client: new HttpToolClient(),
  version: '1.0.0',
});

export const POST = createStreamableHttpHandler(server, {
  sessionIdGenerator: () => crypto.randomUUID(),
});
```

To use the tool registry without the MCP protocol, for example with the Vercel
AI SDK, import `TOOL_DEFINITIONS` and supply your own `ToolClient`. The stdio
binary stays available as `@walkeros/mcp/stdio` and the `walkeros-mcp` bin
entry.

## Documentation

Full parameter tables, workflows, and examples live in the docs:
**https://www.walkeros.io/docs/apps/mcp**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
