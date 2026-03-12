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
import { registerFeedbackTool } from './tools/feedback.js';
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

## Flow Config Structure

Every flow config follows this shape:

\`\`\`json
{
  "version": 3,
  "flows": {
    "default": {
      "web": {},
      "sources": { "<name>": { "package": "<npm-package>", "config": {} } },
      "destinations": { "<name>": { "package": "<npm-package>", "config": { "settings": {} } } }
    }
  }
}
\`\`\`

Event format: \`{ name: "entity action", data: {...}, entity: "...", action: "..." }\`. Sources convert raw input into this format.

Key rules:
- \`version: 3\` is required
- Each flow must have exactly one of \`web: {}\` or \`server: {}\`
- Destination settings go inside \`config.settings\`, not directly on the destination
- Read \`walkeros://reference/flow-schema\` for the full annotated structure

## Getting Started

1. \`flow_load({ platform: "web" })\` or \`flow_load({ source: "./flow.json" })\` — create or load a flow
2. \`package_search({ type: "destination", platform: "web" })\` — discover available packages
3. Use the \`add-step\` prompt to add sources, destinations, transformers, or stores
4. Use the \`setup-mapping\` prompt to configure event transformations
5. \`flow_validate({ type: "flow", input: "flow.json" })\` — verify configuration
6. \`flow_simulate({ configPath: "flow.json", event: "..." })\` — test with mocked API calls
7. \`flow_bundle({ configPath: "flow.json" })\` — build deployable JavaScript
8. \`api({ action: "deploy", id: "cfg_..." })\` — deploy to walkerOS cloud (requires WALKEROS_TOKEN env var; unavailable without it)

If validation fails, fix the reported errors and re-validate. Do not skip validation.

## Reference Resources

Read these before constructing configs manually: \`walkeros://reference/flow-schema\`, \`walkeros://reference/mapping\`, \`walkeros://reference/event-model\`, \`walkeros://reference/consent\`, \`walkeros://reference/variables\`, \`walkeros://reference/contract\`, \`walkeros://reference/examples\`.

## Key Concepts

- **Steps** are sources, destinations, transformers, or stores — each backed by an npm package. Use \`package_search\` to browse, \`package_get\` for schemas and examples.
- **Mapping** transforms events using data/map/loop/set/condition rules. Same syntax on sources and destinations. Mapping rules use NESTED entity → action keying: event name "product add" maps to \`{ "product": { "add": Rule } }\`. Wildcards: \`{ "*": { "view": Rule } }\`.
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
registerFeedbackTool(server);
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
