# @walkeros/mcp

MCP server for walkerOS — validate, bundle, and simulate analytics events
locally, plus manage projects and flows via the walkerOS API.

## Installation

```bash
npm install @walkeros/mcp
```

## Environment Variables

| Variable              | Required                   | Default                   | Purpose                          |
| --------------------- | -------------------------- | ------------------------- | -------------------------------- |
| `WALKEROS_TOKEN`      | Yes (API tools)            | —                         | Bearer token (`sk-walkeros-...`) |
| `WALKEROS_PROJECT_ID` | Yes (project-scoped tools) | —                         | Active project ID (`proj_...`)   |
| `WALKEROS_APP_URL`    | No                         | `https://app.walkeros.io` | Base URL override                |

API tools require `WALKEROS_TOKEN`. Project-scoped tools (flows) also need
`WALKEROS_PROJECT_ID`, or you can pass `projectId` as a parameter.

## Usage with Claude Desktop

```json
{
  "mcpServers": {
    "walkeros": {
      "command": "npx",
      "args": ["@walkeros/mcp"],
      "env": {
        "WALKEROS_TOKEN": "sk-walkeros-...",
        "WALKEROS_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

## Usage with Claude Code

```json
{
  "mcpServers": {
    "walkeros": {
      "command": "npx",
      "args": ["@walkeros/mcp"],
      "env": {
        "WALKEROS_TOKEN": "sk-walkeros-...",
        "WALKEROS_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

## Available Tools (17)

### Local CLI Tools

#### `validate`

Validate walkerOS events, flow configurations, or mapping rules.

- `type` (required): `"event"` | `"flow"` | `"mapping"`
- `input` (required): JSON string or file path to validate
- `flow` (optional): Flow name to validate against

#### `bundle`

Bundle a walkerOS flow configuration into deployable JavaScript.

- `configPath` (required): Path to the flow configuration file
- `flow` (optional): Specific flow name to bundle
- `stats` (optional): Include bundle statistics in output
- `output` (optional): Output file path for the bundle

#### `simulate`

Simulate events through a walkerOS flow without making real API calls.

- `configPath` (required): Path to the flow configuration file
- `event` (required): JSON string representing the event to simulate
- `flow` (optional): Flow name to simulate through
- `platform` (optional): `"web"` | `"server"` (default: `"web"`)

#### `push`

Push a real event through a walkerOS flow to actual destinations. WARNING: This
makes real API calls to real endpoints.

- `configPath` (required): Path to the flow configuration file
- `event` (required): JSON string representing the event to push
- `flow` (optional): Flow name for multi-flow configs
- `platform` (optional): `"web"` | `"server"` (default: `"web"`)

### Auth

#### `whoami`

Verify your API token and see your identity. Returns user ID, email, and project
ID.

### Projects

#### `list-projects`

List all projects you have access to.

#### `get-project`

Get details for a project. Uses `WALKEROS_PROJECT_ID` if `projectId` is omitted.

- `projectId` (optional): Project ID

#### `create-project`

Create a new project.

- `name` (required): Project name

#### `update-project`

Update a project name.

- `projectId` (optional): Project ID
- `name` (required): New project name

#### `delete-project`

Soft-delete a project and all its flows.

- `projectId` (optional): Project ID

### Flows

#### `list-flows`

List all flow configurations in a project.

- `projectId` (optional): Project ID
- `sort` (optional): `"name"` | `"updated_at"` | `"created_at"`
- `order` (optional): `"asc"` | `"desc"`
- `includeDeleted` (optional): Include soft-deleted flows

#### `get-flow`

Get a flow configuration with its full content.

- `flowId` (required): Flow ID (`cfg_...`)
- `projectId` (optional): Project ID

#### `create-flow`

Create a new flow configuration.

- `name` (required): Flow name
- `content` (required): Flow.Setup JSON content
- `projectId` (optional): Project ID

#### `update-flow`

Update a flow name and/or content. Creates a version snapshot automatically.

- `flowId` (required): Flow ID (`cfg_...`)
- `name` (optional): New flow name
- `content` (optional): New Flow.Setup JSON content
- `projectId` (optional): Project ID

#### `delete-flow`

Soft-delete a flow configuration.

- `flowId` (required): Flow ID (`cfg_...`)
- `projectId` (optional): Project ID

#### `duplicate-flow`

Create a copy of an existing flow configuration.

- `flowId` (required): Flow ID to duplicate (`cfg_...`)
- `name` (optional): Name for the copy
- `projectId` (optional): Project ID

### Bundle (Remote)

#### `bundle-remote`

Bundle a flow configuration using the walkerOS cloud service. No local build
tools needed.

- `content` (required): Flow.Setup JSON content

## Local Development

### Smoke Test

A script exercises all API endpoints against a running app instance:

```bash
WALKEROS_TOKEN='<your-token>' \
WALKEROS_APP_URL=http://localhost:3000 \
WALKEROS_PROJECT_ID='<your-project-id>' \
npx tsx packages/mcp/scripts/smoke-test.ts
```

### Updating the OpenAPI Baseline

The contract test (`npm test`) checks that all MCP endpoints exist in a snapshot
of the app's OpenAPI spec. After API changes:

```bash
curl $WALKEROS_APP_URL/api/openapi.json | python3 -m json.tool \
  > packages/mcp/src/__tests__/fixtures/openapi-baseline.json
```

## Dependencies

This package depends on:

- `@walkeros/cli` — walkerOS command-line interface (validate, bundle, simulate,
  push)
- `@modelcontextprotocol/sdk` — Model Context Protocol server framework

## License

MIT
