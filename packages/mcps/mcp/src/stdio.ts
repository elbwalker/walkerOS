import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setClientContext } from '@walkeros/cli';

import { createWalkerOSMcpServer } from './server.js';
import { HttpToolClient } from './http-tool-client.js';

declare const __VERSION__: string;

setClientContext({ type: 'mcp', version: __VERSION__ });

async function main() {
  const server = createWalkerOSMcpServer({
    client: new HttpToolClient(),
    version: __VERSION__,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS Flow MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Flow MCP server:', error);
  process.exit(1);
});
