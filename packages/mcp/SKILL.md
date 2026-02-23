# MCP Packages

Parent folder for all walkerOS MCP server packages.

## Structure

Each sub-folder is an independent MCP server package with its own
`package.json`, build config, and tests.

## Conventions

- Each package is registered in `walkerOS/package.json` workspaces
- Each package is registered in `.claude-plugin/plugin.json` mcpServers
- Shared MCP utility code (response helpers) lives in `@walkeros/core`
- Domain schemas are owned by each package, not shared between MCP servers
- Cross-package data access uses `@walkeros/cli` typed functions

## Adding a New MCP Package

1. Create `packages/mcp/<name>/` with package.json, tsup, jest, tsconfig
2. Add to monorepo workspaces in `walkerOS/package.json`
3. Add to `.claude-plugin/plugin.json` mcpServers
4. Use `mcpResult`/`mcpError` from `@walkeros/core` for response formatting
5. Follow existing package patterns for tool registration, annotations, and
   output schemas
