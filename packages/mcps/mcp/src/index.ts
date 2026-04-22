import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setClientContext } from '@walkeros/cli';

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
import { registerAuthTool } from './tools/auth.js';
import { registerProjectManageTool } from './tools/project-manage.js';
import { registerFlowManageTool } from './tools/flow-manage.js';
import { registerDeployTool } from './tools/deploy-manage.js';
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerReferenceResources } from './resources/references.js';
import { registerAddStepPrompt } from './prompts/add-step.js';
import { registerSetupMappingPrompt } from './prompts/setup-mapping.js';
import { registerManageContractPrompt } from './prompts/manage-contract.js';
import { registerUseDefinitionsPrompt } from './prompts/use-definitions.js';

declare const __VERSION__: string;

// Identify this process as the MCP client for the walkerOS app's version
// gate. Must run before any code that constructs an API client or fetches.
setClientContext({ type: 'mcp', version: __VERSION__ });

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

1. \`auth({ action: "status" })\` — check if logged in, or \`auth({ action: "login" })\` to connect
2. \`project_manage({ action: "list" })\` — see your projects
3. \`flow_manage({ action: "list" })\` — see all flows across projects
4. \`flow_load({ platform: "web" })\` or \`flow_load({ source: "./flow.json" })\` — create or load
5. \`package_search({ type: "destination", platform: "web" })\` — discover packages
6. \`package_get({ package: "..." })\` — read schemas, hints, examples
7. Use the \`add-step\` prompt — guided step addition
8. Use the \`setup-mapping\` prompt — event transformation config
9. \`flow_validate({ type: "flow", input: "flow.json" })\` — verify
10. \`flow_simulate({ configPath: "flow.json", event: "..." })\` — test
11. \`flow_manage({ action: "update", flowId: "...", content: {...} })\` — save to cloud
12. \`deploy_manage({ action: "deploy", flowId: "..." })\` — deploy

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

## Simulation Tips

- Destinations with \`require: ["consent"]\` stay **pending** until a \`"walker consent"\` event fires. Simulation will error "not found" for pending destinations — remove \`require\` from config when testing with \`flow_simulate\`.
- Destinations with \`consent: { marketing: true }\` silently skip events that lack matching consent. Include \`consent\` in the event: \`{ name: "page view", data: {...}, consent: { marketing: true } }\`.
- **Mapping** transforms event names and data at the destination level. Events without a matching mapping rule pass through unmodified.
- **Policy** modifies the event before mapping runs — use it to inject computed fields or redact sensitive data.

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
registerAuthTool(server);
registerProjectManageTool(server);
registerFlowManageTool(server);
registerDeployTool(server);
registerPackageSchemaResources(server);
registerReferenceResources(server);
registerAddStepPrompt(server);
registerSetupMappingPrompt(server);
registerManageContractPrompt(server);
registerUseDefinitionsPrompt(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS Flow MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Flow MCP server:', error);
  process.exit(1);
});
