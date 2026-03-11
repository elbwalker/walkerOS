import { registerFlowPushTool } from '../../tools/push.js';
import { PushOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    PushInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
    },
  },
}));

jest.mock('@walkeros/cli', () => ({
  push: jest.fn(),
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

import { push } from '@walkeros/cli';
const mockPush = jest.mocked(push);

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

describe('flow_push tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowPushTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_push');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Push Events');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('flow_push');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(PushOutputShape);
  });

  it('calls push with correct params', async () => {
    const mockResult = { success: true, duration: 120 };
    mockPush.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      '{"name":"page view"}',
      { json: true, flow: undefined, platform: undefined },
    );
    expect(result.structuredContent).toEqual(mockResult);
    expect(result.isError).toBeUndefined();
  });

  it('returns isError on CLI failure', async () => {
    mockPush.mockRejectedValue(new Error('Push failed'));

    const tool = server.getTool('flow_push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Push failed');
  });

  it('passes flow and platform parameters', async () => {
    mockPush.mockResolvedValue({ success: true });

    const tool = server.getTool('flow_push');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: 'server',
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      '{"name":"page view"}',
      { json: true, flow: 'production', platform: 'server' },
    );
  });

  it('returns error when result.success is false', async () => {
    mockPush.mockResolvedValue({
      success: false,
      error: 'Connection refused',
      duration: 50,
    });

    const tool = server.getTool('flow_push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
  });

  it('handles non-Error exceptions', async () => {
    mockPush.mockRejectedValue(42);

    const tool = server.getTool('flow_push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Unknown error');
  });
});
