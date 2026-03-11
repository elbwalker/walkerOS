import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerFlowValidateTool } from './tools/validate.js';
import { registerFlowBundleTool } from './tools/bundle.js';
import { registerFlowSimulateTool } from './tools/simulate.js';
import { registerFlowPushTool } from './tools/push.js';
import { registerFlowExamplesTool } from './tools/examples.js';
import {
  registerPackageSearchTool,
  registerGetPackageSchemaTool,
} from './tools/package.js';
import { registerFlowLoadTool } from './tools/flow-load.js';
import { registerApiTool } from './tools/api.js';
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerReferenceResources } from './resources/references.js';
import { registerAddStepPrompt } from './prompts/add-step.js';
import { registerSetupMappingPrompt } from './prompts/setup-mapping.js';
import { registerManageContractPrompt } from './prompts/manage-contract.js';
import { registerUseDefinitionsPrompt } from './prompts/use-definitions.js';

declare const __VERSION__: string;

const server = new McpServer(
  {
    name: 'walkeros-flow',
    version: __VERSION__,
  },
  {
    instructions: `walkerOS is an open-source, privacy-first event data collection platform. Define event pipelines as code using JSON flow configurations.

## Architecture: Source → Collector → Destination(s)

Every component in a flow is a **step**: sources capture events, transformers process them, destinations deliver them, stores provide shared state. Steps connect via \`next\` (pre-collector) and \`before\` (post-collector) chains.

## Getting Started

1. \`flow_load({ platform: "web" })\` or \`flow_load({ source: "./flow.json" })\` — create or load a flow
2. Use the \`add-step\` prompt to add sources, destinations, transformers, or stores
3. Use the \`setup-mapping\` prompt to configure event transformations
4. \`flow_validate({ type: "flow", input: "flow.json" })\` — verify configuration
5. \`flow_simulate({ configPath: "flow.json", event: "..." })\` — test with mocked API calls
6. \`flow_bundle({ configPath: "flow.json" })\` — build deployable JavaScript
7. \`api({ action: "deploy", id: "cfg_..." })\` — deploy to walkerOS cloud (requires WALKEROS_TOKEN)

## Reference Resources

Attach these for context: \`walkeros://reference/flow-schema\`, \`walkeros://reference/mapping\`, \`walkeros://reference/event-model\`, \`walkeros://reference/consent\`, \`walkeros://reference/variables\`, \`walkeros://reference/contract\`.

## Key Concepts

- **Steps** are sources, destinations, transformers, or stores — each backed by an npm package with schemas, hints, and examples.
- **Mapping** transforms events using data/map/loop/set/condition rules. Same syntax on sources and destinations.
- **Contracts** define event schemas using entity-action keying. Can generate FROM mappings or scaffold mappings FROM contracts.
- **Variables** (\$var, \$env, \$def, \$code, \$store) enable DRY, environment-aware config. Use the \`use-definitions\` prompt to extract shared patterns.
- **Consent** gates destinations, mapping rules, and individual fields. Privacy-first by design.`,
  },
);

registerFlowValidateTool(server);
registerFlowBundleTool(server);
registerFlowSimulateTool(server);
registerFlowPushTool(server);
registerFlowExamplesTool(server);
registerPackageSearchTool(server);
registerGetPackageSchemaTool(server);
registerFlowLoadTool(server);
registerPackageSchemaResources(server);
registerReferenceResources(server);
registerAddStepPrompt(server);
registerSetupMappingPrompt(server);
registerManageContractPrompt(server);
registerUseDefinitionsPrompt(server);

if (process.env.WALKEROS_TOKEN) {
  registerApiTool(server);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS Flow MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Flow MCP server:', error);
  process.exit(1);
});
