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

import { bundle } from '@walkeros/cli';
import { stubClient } from '../support/stub-client.js';
const mockBundle = jest.mocked(bundle);

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
  let getFlow: jest.Mock;

  beforeEach(() => {
    server = createMockServer();
    getFlow = jest.fn();
    registerFlowBundleTool(server as any, stubClient({ getFlow }));
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
    const mockResult = {
      totalSize: 1024,
      buildTime: 150,
      packages: [],
      treeshakingEffective: false,
    };
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
    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.totalSize).toBe(mockResult.totalSize);
    expect(result.structuredContent.buildTime).toBe(mockResult.buildTime);
  });

  it('defaults stats to true when not provided', async () => {
    mockBundle.mockResolvedValue({
      totalSize: 512,
      buildTime: 0,
      packages: [],
      treeshakingEffective: false,
    });

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

  it('returns warning when bundle returns null', async () => {
    mockBundle.mockResolvedValue(undefined);

    const tool = server.getTool('flow_bundle');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(result.structuredContent.success).toBe(false);
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

  it('resolves a cloud flow id (flow_…) via the client and passes the config inline', async () => {
    const cloudConfig = { version: 4, flows: { default: {} } };
    getFlow.mockResolvedValue({ config: cloudConfig });
    mockBundle.mockResolvedValue({
      totalSize: 256,
      buildTime: 10,
      packages: [],
      treeshakingEffective: false,
    });

    const tool = server.getTool('flow_bundle');
    await tool.handler({
      configPath: 'flow_abc123',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(getFlow).toHaveBeenCalledWith({ flowId: 'flow_abc123' });
    expect(mockBundle).toHaveBeenCalledWith(JSON.stringify(cloudConfig), {
      flowName: undefined,
      stats: true,
      buildOverrides: undefined,
    });
  });

  it('resolves a cloud config id (cfg_…) via the client', async () => {
    const cloudConfig = { version: 4, flows: { default: {} } };
    getFlow.mockResolvedValue({ config: cloudConfig });
    mockBundle.mockResolvedValue({
      totalSize: 256,
      buildTime: 10,
      packages: [],
      treeshakingEffective: false,
    });

    const tool = server.getTool('flow_bundle');
    await tool.handler({
      configPath: 'cfg_xyz789',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(getFlow).toHaveBeenCalledWith({ flowId: 'cfg_xyz789' });
    expect(mockBundle).toHaveBeenCalledWith(JSON.stringify(cloudConfig), {
      flowName: undefined,
      stats: true,
      buildOverrides: undefined,
    });
  });

  it('passes a local file path through unchanged (no client call)', async () => {
    mockBundle.mockResolvedValue({
      totalSize: 256,
      buildTime: 10,
      packages: [],
      treeshakingEffective: false,
    });

    const tool = server.getTool('flow_bundle');
    await tool.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(getFlow).not.toHaveBeenCalled();
    expect(mockBundle).toHaveBeenCalledWith('./flow.json', expect.anything());
  });
});
