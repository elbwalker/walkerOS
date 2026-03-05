import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerGenerateTool } from './tools/generate.js';
import { registerParseTool } from './tools/parse.js';
import { registerValidateTool } from './tools/validate.js';
import { registerDocResources } from './resources/docs.js';

declare const __VERSION__: string;

const server = new McpServer({
  name: 'walkeros-source-browser',
  version: __VERSION__,
});

registerGenerateTool(server);
registerParseTool(server);
registerValidateTool(server);
registerDocResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS source-browser MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
