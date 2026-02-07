# @walkeros/mcp

MCP server for walkerOS — validate, bundle, and simulate analytics events
locally, plus manage projects, flows, and versions via the walkerOS API.

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

API tools require `WALKEROS_TOKEN`. Project-scoped tools (flows, versions) also
need `WALKEROS_PROJECT_ID`, or you can pass `projectId` as a parameter.

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

## Available Tools (19)

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

### Versions

#### `list-versions`

List version history for a flow configuration.

- `flowId` (required): Flow ID (`cfg_...`)
- `projectId` (optional): Project ID

#### `get-version`

Get a specific version of a flow configuration.

- `flowId` (required): Flow ID (`cfg_...`)
- `version` (required): Version number
- `projectId` (optional): Project ID

#### `restore-version`

Restore a flow to a previous version. Current content becomes a new version in
history.

- `flowId` (required): Flow ID (`cfg_...`)
- `version` (required): Version number to restore
- `projectId` (optional): Project ID

### Bundle (Remote)

#### `bundle-remote`

Bundle a flow configuration using the walkerOS cloud service. No local build
tools needed.

- `content` (required): Flow.Setup JSON content

## Peer Dependencies

This package requires:

- `@walkeros/cli` — walkerOS command-line interface
- `zod` ^4.0 — schema validation

## License

MIT
