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

## Rules

- **Never guess package names.** Always use \`package_search\` first to find exact names, then \`package_get\` for details.
- **Never construct flow configs from memory.** Read \`walkeros://reference/flow-schema\` and use \`package_get\` for package-specific schemas.
- **Always validate.** Run \`flow_validate\` after every config change. If validation fails, fix and re-validate.
- **Simulate before deploying.** Use \`flow_simulate\` to test with mocked API calls before \`flow_bundle\` or \`flow_push\`.

## Workflow

1. \`flow_load({ platform: "web" })\` or \`flow_load({ source: "./flow.json" })\` — create or load
2. \`package_search({ type: "destination", platform: "web" })\` — discover packages
3. \`package_get({ package: "..." })\` — read schemas, hints, examples
4. Use the \`add-step\` prompt — guided step addition
5. Use the \`setup-mapping\` prompt — event transformation config
6. \`flow_validate({ type: "flow", input: "flow.json" })\` — verify
7. \`flow_simulate({ configPath: "flow.json", event: "..." })\` — test
8. \`flow_bundle({ configPath: "flow.json" })\` — build
9. \`api({ action: "deploy", id: "cfg_..." })\` — deploy (requires WALKEROS_TOKEN)

## Architecture: Source → Collector → Destination(s)

Every component in a flow is a **step**: sources capture events, transformers process them, destinations deliver them, stores provide shared state. Steps connect via \`next\` (pre-collector) and \`before\` (post-collector) chains.

## Flow Config Structure

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

- \`version: 3\` is required
- Each flow must have exactly one of \`web: {}\` or \`server: {}\`
- Destination settings go inside \`config.settings\`, not directly on the destination
- Event format: \`{ name: "entity action", data: {...}, entity: "...", action: "..." }\`

## Key Concepts

- **Mapping** transforms events using data/map/loop/set/condition rules. Same syntax on sources and destinations. Mapping rules use NESTED entity → action keying: event name "product add" maps to \`{ "product": { "add": Rule } }\`. Wildcards: \`{ "*": { "view": Rule } }\`.
- **Contracts** define event schemas using entity-action keying. Can generate FROM mappings or scaffold mappings FROM contracts.
- **Variables** (\$var, \$env, \$def, \$code, \$store) enable DRY, environment-aware config. Use the \`use-definitions\` prompt to extract shared patterns.
- **Consent** gates destinations, mapping rules, and individual fields. Privacy-first by design.

## Reference Resources

Read these before constructing configs manually: \`walkeros://reference/flow-schema\`, \`walkeros://reference/mapping\`, \`walkeros://reference/event-model\`, \`walkeros://reference/consent\`, \`walkeros://reference/variables\`, \`walkeros://reference/contract\`, \`walkeros://reference/examples\`.`,
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
