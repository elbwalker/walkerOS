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
import { registerPackageSchemaResources } from './resources/package-schemas.js';

declare const __VERSION__: string;

const server = new McpServer({
  name: 'walkeros-cli',
  version: __VERSION__,
});

registerValidateTool(server);
registerBundleTool(server);
registerSimulateTool(server);
registerPushTool(server);
registerExamplesListTool(server);
registerPackageSearchTool(server);
registerGetPackageSchemaTool(server);
registerPackageSchemaResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS MCP CLI server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP CLI server:', error);
  process.exit(1);
});
