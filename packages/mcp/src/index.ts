import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Local CLI tools
import { registerBundleTool } from './tools/bundle.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerPushTool } from './tools/push.js';
import { registerValidateTool } from './tools/validate.js';
// API tools
import { registerAuthTools } from './tools/auth.js';
import { registerProjectTools } from './tools/projects.js';
import { registerFlowTools } from './tools/flows.js';
// CDN tools
import { registerGetPackageSchemaTool } from './tools/get-package-schema.js';
// Resources
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerFlowResources } from './resources/flows.js';

declare const __VERSION__: string;

const server = new McpServer({
  name: 'walkeros',
  version: __VERSION__,
});

// Local CLI tools
registerBundleTool(server);
registerSimulateTool(server);
registerPushTool(server);
registerValidateTool(server);

// API tools
registerAuthTools(server);
registerProjectTools(server);
registerFlowTools(server);

// CDN tools
registerGetPackageSchemaTool(server);

// Resources
registerPackageSchemaResources(server);
registerFlowResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
