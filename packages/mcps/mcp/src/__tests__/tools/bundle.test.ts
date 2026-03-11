import { registerFlowBundleTool } from '../../tools/bundle.js';
import { BundleOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    BundleInputShape: {
      configPath: { type: 'string' },
      flow: { type: 'string' },
      stats: { type: 'boolean' },
      output: { type: 'string' },
    },
  },
}));

jest.mock('@walkeros/cli', () => ({
  bundle: jest.fn(),
  bundleRemote: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, summary) => ({
    content: [
      { type: 'text', text: summary ?? JSON.stringify(result, null, 2) },
    ],
    structuredContent: result,
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

import { bundle, bundleRemote } from '@walkeros/cli';
const mockBundle = jest.mocked(bundle);
const mockBundleRemote = jest.mocked(bundleRemote);

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

describe('flow_bundle tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowBundleTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_bundle');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Bundle Flow');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('flow_bundle');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(BundleOutputShape);
  });

  it('calls CLI bundle with correct options', async () => {
    const mockResult = { totalSize: 1024, buildTime: 150 };
    mockBundle.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: 'myFlow',
      stats: true,
      output: './dist',
    });

    expect(mockBundle).toHaveBeenCalledWith('./flow.json', {
      flowName: 'myFlow',
      stats: true,
      buildOverrides: { output: './dist' },
    });
    expect(result.structuredContent).toEqual(mockResult);
  });

  it('defaults stats to true when not provided', async () => {
    mockBundle.mockResolvedValue({ totalSize: 512 });

    const tool = server.getTool('flow_bundle');
    await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(mockBundle).toHaveBeenCalledWith('./flow.json', {
      flowName: undefined,
      stats: true,
      buildOverrides: undefined,
    });
  });

  it('returns fallback when bundle returns null', async () => {
    mockBundle.mockResolvedValue(null);

    const tool = server.getTool('flow_bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(result.structuredContent).toEqual({
      success: true,
      message: 'Bundle created',
    });
    expect(result.isError).toBeUndefined();
  });

  it('returns isError on CLI failure', async () => {
    mockBundle.mockRejectedValue(new Error('Build failed'));

    const tool = server.getTool('flow_bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Build failed');
  });

  describe('remote bundling', () => {
    it('calls bundleRemote when remote is true', async () => {
      const content = { version: 1, flows: {} };
      mockBundleRemote.mockResolvedValue({ bundle: 'code', size: 512 });

      const tool = server.getTool('flow_bundle');
      const result = await tool.handler({ remote: true, content });

      expect(mockBundleRemote).toHaveBeenCalledWith({ content });
      expect(mockBundle).not.toHaveBeenCalled();
      expect(result.structuredContent.success).toBe(true);
      expect(result.structuredContent.bundle).toBe('code');
    });

    it('returns error when remote is true but content is missing', async () => {
      const tool = server.getTool('flow_bundle');
      const result = await tool.handler({ remote: true });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain('content');
    });
  });
});
