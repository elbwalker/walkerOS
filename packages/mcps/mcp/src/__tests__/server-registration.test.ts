import './support/version.js';

// Connecting a client fires the server's telemetry start; keep it local.
jest.mock('../telemetry.js', () => ({
  createMcpEmitter: jest.fn(async () => ({
    emitStart: async () => {},
    emitInvoke: async () => {},
  })),
}));

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { createWalkerOSMcpServer } from '../server.js';
import { createToolHandlers } from '../index.js';
import { stubClient } from './support/stub-client.js';

/**
 * Tool tests drive the `create*ToolSpec` factories directly. This pins the
 * seam they skip: what each `register*Tool` hands the real McpServer, read
 * back through a connected client the way an MCP host sees it, matches the
 * spec the tests exercise.
 */
describe('server tool registration', () => {
  it('registers every tool spec with its title, description, annotations and input fields', async () => {
    const client = stubClient();
    const specs = createToolHandlers(client, '0.0.0');
    const server = createWalkerOSMcpServer({ client, version: '0.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: 'test', version: '0' });
    await Promise.all([
      server.connect(serverTransport),
      mcp.connect(clientTransport),
    ]);

    const { tools } = await mcp.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      Object.keys(specs).sort(),
    );

    for (const tool of tools) {
      const spec = specs[tool.name];
      const fields = Object.keys(spec.inputSchema);
      const required = fields.filter(
        (field) => !z.safeParse(spec.inputSchema[field], undefined).success,
      );
      expect({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        annotations: tool.annotations,
        fields: Object.keys(tool.inputSchema.properties ?? {}).sort(),
        required: [...(tool.inputSchema.required ?? [])].sort(),
      }).toEqual({
        name: spec.name,
        title: spec.title,
        description: spec.description,
        annotations: spec.annotations,
        fields: fields.sort(),
        required: required.sort(),
      });
    }

    await mcp.close();
  });
});
