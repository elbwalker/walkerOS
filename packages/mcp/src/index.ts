#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBundleTool } from './tools/bundle.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerValidateTool } from './tools/validate.js';

const server = new McpServer({
  name: 'walkeros',
  version: '0.1.0',
});

// Register tools
registerBundleTool(server);
registerSimulateTool(server);
registerValidateTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (stdout is for MCP protocol)
  console.error('walkerOS MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
