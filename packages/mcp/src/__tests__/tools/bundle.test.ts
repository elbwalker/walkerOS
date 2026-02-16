import { registerBundleTool } from '../../tools/bundle.js';
import { BundleOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
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

// Mock @walkeros/cli (dynamic import target)
jest.mock('@walkeros/cli', () => ({
  bundle: jest.fn(),
  bundleRemote: jest.fn(),
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

describe('bundle tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerBundleTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('bundle');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Bundle');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('bundle');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(BundleOutputShape);
  });

  it('calls CLI bundle with correct options', async () => {
    const mockResult = { size: 1024, modules: 3 };
    mockBundle.mockResolvedValue(mockResult);

    const tool = server.getTool('bundle');
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
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    expect(result.structuredContent).toEqual(mockResult);
  });

  it('defaults stats to true when not provided', async () => {
    mockBundle.mockResolvedValue({ size: 512 });

    const tool = server.getTool('bundle');
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

  it('returns default success message when bundle returns null', async () => {
    mockBundle.mockResolvedValue(null);

    const tool = server.getTool('bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    const fallback = { success: true, message: 'Bundle created' };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fallback);
    expect(result.structuredContent).toEqual(fallback);
    expect(result.isError).toBeUndefined();
  });

  it('returns default success message when bundle returns undefined', async () => {
    mockBundle.mockResolvedValue(undefined);

    const tool = server.getTool('bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    const fallback = { success: true, message: 'Bundle created' };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(fallback);
    expect(result.structuredContent).toEqual(fallback);
  });

  it('returns isError on CLI failure', async () => {
    mockBundle.mockRejectedValue(new Error('Build failed'));

    const tool = server.getTool('bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Build failed');
  });

  it('handles non-Error exceptions', async () => {
    mockBundle.mockRejectedValue('string error');

    const tool = server.getTool('bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Unknown error');
  });

  describe('remote bundling', () => {
    it('calls bundleRemote when remote is true', async () => {
      const content = { version: 1, flows: {} };
      mockBundleRemote.mockResolvedValue({ bundle: 'code', size: 512 });

      const tool = server.getTool('bundle');
      const result = await tool.handler({ remote: true, content });

      expect(mockBundleRemote).toHaveBeenCalledWith({ content });
      expect(mockBundle).not.toHaveBeenCalled();
      expect(result.structuredContent.success).toBe(true);
      expect(result.structuredContent.bundle).toBe('code');
    });

    it('calls local bundle when remote is false', async () => {
      mockBundle.mockResolvedValue({ success: true });

      const tool = server.getTool('bundle');
      await tool.handler({ configPath: './flow.json', remote: false });

      expect(mockBundle).toHaveBeenCalled();
      expect(mockBundleRemote).not.toHaveBeenCalled();
    });

    it('defaults to local bundle when remote is omitted', async () => {
      mockBundle.mockResolvedValue({ success: true });

      const tool = server.getTool('bundle');
      await tool.handler({ configPath: './flow.json' });

      expect(mockBundle).toHaveBeenCalled();
      expect(mockBundleRemote).not.toHaveBeenCalled();
    });

    it('returns error when remote is true but content is missing', async () => {
      const tool = server.getTool('bundle');
      const result = await tool.handler({ remote: true });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain('content');
    });

    it('returns error on remote API failure', async () => {
      mockBundleRemote.mockRejectedValue(new Error('Invalid config'));

      const tool = server.getTool('bundle');
      const result = await tool.handler({
        remote: true,
        content: { version: 1 },
      });

      expect(result.isError).toBe(true);
    });
  });
});
