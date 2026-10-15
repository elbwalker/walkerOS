import './support/version.js';

// The package schema template lists the catalog; keep it off the network.
jest.mock('../catalog.js', () => ({
  ...jest.requireActual('../catalog.js'),
  fetchCatalog: jest.fn(async () => ({
    entries: [
      {
        name: '@walkeros/web-destination-gtag',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
      },
    ],
    warnings: [],
  })),
}));

// Connecting a client fires the server's telemetry start; keep it local.
jest.mock('../telemetry.js', () => ({
  createMcpEmitter: jest.fn(async () => ({
    emitStart: async () => {},
    emitInvoke: async () => {},
    emitError: async () => {},
  })),
}));

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { createWalkerOSMcpServer } from '../server.js';
import { createToolHandlers } from '../index.js';
import { createLocalRuntime } from '../runtime/local.js';
import type { ToolSpec } from '../tool-spec.js';
import { KNOWLEDGE_RESOURCES, PROMPTS } from '../specs.js';

/**
 * Tool tests drive the `create*ToolSpec` factories directly. This pins the
 * one registration path they skip: what the server hands the real McpServer,
 * read back through a connected client the way an MCP host sees it, matches
 * the specs the tests exercise, tools, resources and prompts alike.
 */
describe('server tool registration', () => {
  it('registers every local tool spec as the spec describes it', async () => {
    const runtime = createLocalRuntime();
    const specs: Record<string, ToolSpec> = createToolHandlers(runtime);
    const server = createWalkerOSMcpServer({ runtime, version: '0.0.0' });
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
        hasOutputSchema: tool.outputSchema !== undefined,
      }).toEqual({
        name: spec.name,
        title: spec.title,
        description: spec.description,
        annotations: spec.annotations,
        fields: fields.sort(),
        required: required.sort(),
        hasOutputSchema: spec.outputSchema !== undefined,
      });
    }

    const { resourceTemplates } = await mcp.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toEqual(
      KNOWLEDGE_RESOURCES.flatMap((spec) =>
        spec.kind === 'template' ? [spec.uriTemplate] : [],
      ),
    );
    const { resources } = await mcp.listResources();
    expect(resources.map((r) => r.uri)).toEqual([
      ...KNOWLEDGE_RESOURCES.flatMap((spec) =>
        spec.kind === 'static' ? [spec.uri] : [],
      ),
      'walkeros://schema/%40walkeros%2Fweb-destination-gtag',
    ]);
    const { prompts } = await mcp.listPrompts();
    expect(
      prompts.map((p) => ({
        name: p.name,
        args: (p.arguments ?? []).map((a) => a.name),
      })),
    ).toEqual(
      PROMPTS.map((spec) => ({
        name: spec.name,
        args: Object.keys(spec.argsSchema),
      })),
    );

    await mcp.close();
  });
});
