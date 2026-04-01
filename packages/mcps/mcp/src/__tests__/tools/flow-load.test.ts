import { registerFlowLoadTool } from '../../tools/flow-load.js';

jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true,
  })),
}));

import { loadJsonConfig } from '@walkeros/cli';
const mockLoadJsonConfig = jest.mocked(loadJsonConfig);

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

describe('flow_load tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerFlowLoadTool(server as any);
  });

  it('registers with correct name and annotations', () => {
    const tool = server.getTool('flow_load');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Load or Create Flow');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('loads from local path', async () => {
    const mockConfig = { version: 1, flows: { default: { web: {} } } };
    mockLoadJsonConfig.mockResolvedValue(mockConfig);

    const tool = server.getTool('flow_load');
    const result = await tool.handler({ source: './flow.json' });

    expect(mockLoadJsonConfig).toHaveBeenCalledWith('./flow.json');
    expect(result.structuredContent).toMatchObject(mockConfig);
    expect(result.structuredContent._hints).toBeDefined();
    expect(result.isError).toBeUndefined();
  });

  it('creates new web flow skeleton', async () => {
    const tool = server.getTool('flow_load');
    const result = await tool.handler({ platform: 'web' });

    expect(mockLoadJsonConfig).not.toHaveBeenCalled();
    expect(result.structuredContent.version).toBe(3);
    expect(result.structuredContent.flows.default.web).toEqual({});
    expect(result.isError).toBeUndefined();
  });

  it('creates new server flow skeleton', async () => {
    const tool = server.getTool('flow_load');
    const result = await tool.handler({ platform: 'server' });

    expect(result.structuredContent.version).toBe(3);
    expect(result.structuredContent.flows.default.server).toEqual({});
  });

  it('errors when neither source nor platform provided', async () => {
    const tool = server.getTool('flow_load');
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('source');
  });

  it('errors when source file does not exist', async () => {
    mockLoadJsonConfig.mockRejectedValue(new Error('File not found'));

    const tool = server.getTool('flow_load');
    const result = await tool.handler({ source: './missing.json' });

    expect(result.isError).toBe(true);
  });

  it('source takes priority over platform', async () => {
    const mockConfig = { version: 1, flows: {} };
    mockLoadJsonConfig.mockResolvedValue(mockConfig);

    const tool = server.getTool('flow_load');
    const result = await tool.handler({
      source: './flow.json',
      platform: 'web',
    });

    expect(mockLoadJsonConfig).toHaveBeenCalledWith('./flow.json');
    expect(result.structuredContent).toMatchObject(mockConfig);
  });
});
