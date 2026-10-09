import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { ToolClient } from '../../tool-client.js';

/**
 * A client connected to an McpServer that carries one registered tool, so a
 * test calls the tool the way an MCP host does: through the SDK's own input
 * validation first, then the handler's.
 */
export async function connectTool(
  register: (server: McpServer, client: ToolClient) => void,
  client: ToolClient,
): Promise<{ mcp: Client; close: () => Promise<void> }> {
  const server = new McpServer({ name: 'test', version: '0' });
  register(server, client);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    mcp.connect(clientTransport),
  ]);
  return {
    mcp,
    close: async () => {
      await Promise.allSettled([mcp.close(), server.close()]);
    },
  };
}
