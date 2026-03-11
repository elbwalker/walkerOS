import { registerFlowSchemaTool } from '../../tools/flow-schema.js';

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('flow_schema tool', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerFlowSchemaTool(mockServer as any);
  });

  it('should register with correct name', () => {
    const tool = mockServer.getTool('flow_schema');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Flow Config Schema');
  });

  it('should return structure, connectionRules, and minimalExample', async () => {
    const tool = mockServer.getTool('flow_schema');
    const result = await tool.handler({});

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.structure).toBeDefined();
    expect(parsed.structure.version).toBeDefined();
    expect(parsed.structure.flows).toBeDefined();
    expect(parsed.connectionRules).toBeDefined();
    expect(Array.isArray(parsed.connectionRules)).toBe(true);
    expect(parsed.connectionRules.length).toBeGreaterThan(0);
    expect(parsed.minimalExample).toBeDefined();
    expect(parsed.minimalExample.version).toBe(1);
    expect(parsed.minimalExample.flows.default).toBeDefined();
  });

  it('should include platform options', async () => {
    const tool = mockServer.getTool('flow_schema');
    const result = await tool.handler({});

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.platformOptions).toBeDefined();
    expect(parsed.platformOptions.web).toBeDefined();
    expect(parsed.platformOptions.server).toBeDefined();
  });

  it('should be idempotent and read-only', () => {
    const tool = mockServer.getTool('flow_schema');
    const annotations = (tool.config as any).annotations;
    expect(annotations.readOnlyHint).toBe(true);
    expect(annotations.idempotentHint).toBe(true);
    expect(annotations.destructiveHint).toBe(false);
  });
});
