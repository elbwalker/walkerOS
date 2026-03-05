import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerAuthTools } from './tools/auth.js';
import { registerProjectTools } from './tools/projects.js';
import { registerFlowTools } from './tools/flows.js';
import { registerDeploymentTools } from './tools/deployments.js';
import { registerFlowResources } from './resources/flows.js';

declare const __VERSION__: string;

const server = new McpServer({
  name: 'walkeros-api',
  version: __VERSION__,
});

registerAuthTools(server);
registerProjectTools(server);
registerFlowTools(server);
registerDeploymentTools(server);
registerFlowResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS MCP API server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP API server:', error);
  process.exit(1);
});
