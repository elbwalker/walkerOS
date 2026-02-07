# @walkeros/mcp

MCP server for walkerOS — validate, bundle, and simulate analytics events
directly from Claude.

## Installation

```bash
npm install @walkeros/mcp
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "walkeros": {
      "command": "npx",
      "args": ["@walkeros/mcp"]
    }
  }
}
```

## Usage with Claude Code

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "walkeros": {
      "command": "npx",
      "args": ["@walkeros/mcp"]
    }
  }
}
```

## Available Tools

### `validate`

Validate walkerOS events, flow configurations, or mapping rules.

**Parameters:**

- `type` (required): `"event"` | `"flow"` | `"mapping"`
- `input` (required): JSON string or file path to validate
- `flow` (optional): Flow name to validate against

**Example:**

```typescript
validate({
  type: 'event',
  input: '{"event":"product view","data":{"product":"shoes"}}',
  flow: 'web',
});
```

### `bundle`

Bundle a walkerOS flow configuration into deployable JavaScript.

**Parameters:**

- `configPath` (required): Path to the flow configuration file
- `flow` (optional): Specific flow name to bundle
- `stats` (optional): Include bundle statistics in output
- `output` (optional): Output file path for the bundle

**Example:**

```typescript
bundle({
  configPath: './config/flow.json',
  flow: 'web',
  stats: true,
  output: './dist/bundle.js',
});
```

### `simulate`

Simulate events through a walkerOS flow without making real API calls.

**Parameters:**

- `configPath` (required): Path to the flow configuration file
- `event` (required): JSON string representing the event to simulate
- `flow` (optional): Flow name to simulate through
- `platform` (optional): `"web"` | `"server"` (default: `"web"`)

**Example:**

```typescript
simulate({
  configPath: './config/flow.json',
  event: '{"event":"product view","data":{"product":"shoes"}}',
  flow: 'web',
  platform: 'web',
});
```

## Peer Dependencies

This package requires:

- `@walkeros/cli` — walkerOS command-line interface
- `zod` ^4.0 — schema validation

## License

MIT
