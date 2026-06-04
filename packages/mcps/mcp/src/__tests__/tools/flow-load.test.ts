import { registerFlowLoadTool } from '../../tools/flow-load.js';
import { stubClient } from '../support/stub-client.js';

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
// Pull the real v4 schema via the `/dev` entry — separate from the mocked
// `@walkeros/core` main entry, so the schema bypasses the mock above.
import { schemas } from '@walkeros/core/dev';
const FlowJsonSchema = schemas.FlowJsonSchema;
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
    registerFlowLoadTool(server as any, stubClient());
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
    expect(result.structuredContent.version).toBe(4);
    expect(result.structuredContent.flows.default.config).toEqual({
      platform: 'web',
      bundle: { packages: {} },
    });
    expect(result.isError).toBeUndefined();
  });

  it('creates new server flow skeleton', async () => {
    const tool = server.getTool('flow_load');
    const result = await tool.handler({ platform: 'server' });

    expect(result.structuredContent.version).toBe(4);
    expect(result.structuredContent.flows.default.config).toEqual({
      platform: 'server',
      bundle: { packages: {} },
    });
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

  it('redacts loaded config identically to flow_manage get (structural keys literal, values wrapped)', async () => {
    const loaded = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            demo: {
              package: '@walkeros/destination-demo',
              config: { settings: { apiKey: 'secret' } },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(loaded);

    const tool = server.getTool('flow_load');
    const result = await tool.handler({ source: './flow.json' });
    const out = result.structuredContent;

    // Structural keys literal — same rule as flow_manage get.
    expect(out.version).toBe(4);
    expect(out.flows.default.config.platform).toBe('web');
    expect(out.flows.default.destinations.demo.package).toBe(
      '@walkeros/destination-demo',
    );
    // User VALUES wrapped.
    expect(out.flows.default.destinations.demo.config.settings.apiKey).toBe(
      '<user_data>secret</user_data>',
    );
  });

  it('flow_load skeleton round-trips through v4 schema', async () => {
    const tool = server.getTool('flow_load');

    const webResult = await tool.handler({ platform: 'web' });
    const webSkeleton = JSON.parse(webResult.content[0].text);
    const webParse = FlowJsonSchema.safeParse(webSkeleton);
    if (!webParse.success) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(webParse.error.issues, null, 2));
    }
    expect(webParse.success).toBe(true);

    const serverResult = await tool.handler({ platform: 'server' });
    const serverSkeleton = JSON.parse(serverResult.content[0].text);
    const serverParse = FlowJsonSchema.safeParse(serverSkeleton);
    if (!serverParse.success) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(serverParse.error.issues, null, 2));
    }
    expect(serverParse.success).toBe(true);
  });

  describe('load by flow/cfg ID via ToolClient', () => {
    it('routes a cfg_ source through client.getFlow, not loadJsonConfig', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'cfg_abc',
        name: 'My Flow',
        config: { version: 4, flows: {} },
      });
      server = createMockServer();
      registerFlowLoadTool(
        server as any,
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_load');
      const result = await tool.handler({ source: 'cfg_abc' });

      expect(getFlow).toHaveBeenCalledTimes(1);
      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_default',
      });
      expect(mockLoadJsonConfig).not.toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({
        version: 4,
        flows: {},
      });
    });

    it('routes a flow_ source through client.getFlow, not loadJsonConfig', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'flow_xyz',
        config: { version: 4, flows: {} },
      });
      server = createMockServer();
      registerFlowLoadTool(
        server as any,
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_load');
      const result = await tool.handler({ source: 'flow_xyz' });

      expect(getFlow).toHaveBeenCalledTimes(1);
      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_xyz',
        projectId: 'proj_default',
      });
      expect(mockLoadJsonConfig).not.toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it.each([
      ['./flow.json', './flow.json'],
      ['https://example.com/flow.json', 'https://example.com/flow.json'],
      ['{"version":4,"flows":{}}', '{"version":4,"flows":{}}'],
    ])('routes non-ID source %s to loadJsonConfig', async (source) => {
      const getFlow = jest.fn();
      mockLoadJsonConfig.mockResolvedValue({ version: 4, flows: {} });
      server = createMockServer();
      registerFlowLoadTool(server as any, stubClient({ getFlow }));

      const tool = server.getTool('flow_load');
      await tool.handler({ source });

      expect(mockLoadJsonConfig).toHaveBeenCalledWith(source);
      expect(getFlow).not.toHaveBeenCalled();
    });

    it('errors with NO_DEFAULT_PROJECT message when no default project and an ID source', async () => {
      const getFlow = jest.fn();
      server = createMockServer();
      registerFlowLoadTool(
        server as never,
        stubClient({ getFlow, getDefaultProject: () => null }),
      );

      const tool = server.getTool('flow_load');
      const result = await tool.handler({ source: 'cfg_abc' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('No default project set');
      expect(parsed.error).not.toContain('Flow not found');
      expect(getFlow).not.toHaveBeenCalled();
    });

    it('surfaces a NOT_FOUND-style error for a non-existent ID, not a file-not-found message', async () => {
      const getFlow = jest
        .fn()
        .mockRejectedValue(new Error('Flow not found: cfg_missing'));
      server = createMockServer();
      registerFlowLoadTool(
        server as any,
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_load');
      const result = await tool.handler({ source: 'cfg_missing' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('Flow not found');
      expect(parsed.error).not.toContain('Configuration file not found');
      expect(parsed.hint ?? '').not.toContain('configPath');
    });

    it('redacts the ID-loaded config: structural keys literal, values wrapped', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'cfg_abc',
        config: {
          version: 4,
          flows: {
            default: {
              config: { platform: 'web' },
              destinations: {
                demo: {
                  package: '@walkeros/destination-demo',
                  config: { settings: { apiKey: 'secret' } },
                },
              },
            },
          },
        },
      });
      server = createMockServer();
      registerFlowLoadTool(
        server as any,
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
      );

      const tool = server.getTool('flow_load');
      const result = await tool.handler({ source: 'cfg_abc' });
      const out = result.structuredContent;

      expect(out.version).toBe(4);
      expect(out.flows.default.config.platform).toBe('web');
      expect(out.flows.default.destinations.demo.package).toBe(
        '@walkeros/destination-demo',
      );
      expect(out.flows.default.destinations.demo.config.settings.apiKey).toBe(
        '<user_data>secret</user_data>',
      );
    });
  });
});
