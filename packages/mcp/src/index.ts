#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Local CLI tools
import { registerBundleTool } from './tools/bundle.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerValidateTool } from './tools/validate.js';
// API tools
import { registerAuthTools } from './tools/auth.js';
import { registerProjectTools } from './tools/projects.js';
import { registerFlowTools } from './tools/flows.js';
import { registerVersionTools } from './tools/versions.js';
import { registerBundleRemoteTool } from './tools/bundle-remote.js';

const server = new McpServer({
  name: 'walkeros',
  version: '0.2.0',
});

// Local CLI tools
registerBundleTool(server);
registerSimulateTool(server);
registerValidateTool(server);

// API tools
registerAuthTools(server);
registerProjectTools(server);
registerFlowTools(server);
registerVersionTools(server);
registerBundleRemoteTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
