import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerValidateTool } from './tools/validate.js';
import { registerBundleTool } from './tools/bundle.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerPushTool } from './tools/push.js';
import { registerExamplesListTool } from './tools/examples.js';
import {
  registerPackageSearchTool,
  registerGetPackageSchemaTool,
} from './tools/package.js';
import { registerFlowSchemaTool } from './tools/flow-schema.js';
import { registerFlowInitTool } from './tools/flow-init.js';
import { registerPackageSchemaResources } from './resources/package-schemas.js';

declare const __VERSION__: string;

const server = new McpServer(
  {
    name: 'walkeros-flow',
    version: __VERSION__,
  },
  {
    instructions: `walkerOS is an open-source, privacy-first event data collection platform. It lets you define event pipelines as code using JSON configuration files (flow.json).

## Core Architecture: Source → Collector → Destination(s)

- **Sources** capture events from browsers, servers, or CMPs (consent management platforms). Events use entity-action naming: "page view", "product add", "order complete".
- **Collector** receives events from sources, applies consent rules, and distributes them to destinations. It's the central hub.
- **Destinations** deliver events to analytics/marketing tools (GA4, Meta, Snowplow, BigQuery, etc.). Each destination can have a **mapping** that transforms vendor-agnostic events into vendor-specific formats.
- **Transformers** (optional) process events in chains: validate, enrich, fingerprint, route, or redact. Sources link via \`next\`, destinations link via \`before\`.
- **Stores** (optional) provide key-value storage (memory, filesystem, S3, GCS). Wired via \`$store:storeName\` in env values.

## Flow.Config

A flow.json defines the complete pipeline: which packages to use, how sources/destinations/transformers/stores connect, and configuration for each. Use \`flow_schema()\` to see the full structure.

## Recommended Workflow

1. \`package_search()\` — browse available packages by type/platform
2. \`package_search({ package: "..." })\` — inspect specific package metadata
3. \`package_get({ package: "...", section: "examples" })\` — see configuration examples
4. \`flow_schema()\` — understand config structure and connection rules
5. \`flow_init({ platform, destinations })\` — scaffold starter flow.json
6. \`validate({ input: "flow.json" })\` — check config validity
7. \`simulate({ config: "flow.json", event: {...} })\` — test event processing with mocked API calls
8. \`bundle({ config: "flow.json" })\` — create deployable JavaScript bundle

## Key Concepts

- **Packages** are npm modules following the \`@walkeros/\` naming convention. Each provides a walkerOS.json manifest with schemas, examples, and hints.
- **Mappings** transform events at the destination level using data/map/loop/set/condition rules. This keeps events vendor-agnostic until delivery.
- **Env pattern** — destinations and sources accept an \`env\` object for runtime values (API keys, endpoints). Use \`$store:storeName\` to wire in store values.`,
  },
);

registerValidateTool(server);
registerBundleTool(server);
registerSimulateTool(server);
registerPushTool(server);
registerExamplesListTool(server);
registerPackageSearchTool(server);
registerGetPackageSchemaTool(server);
registerFlowSchemaTool(server);
registerFlowInitTool(server);
registerPackageSchemaResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS Flow MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Flow MCP server:', error);
  process.exit(1);
});
