import { createLocalRuntime } from '../../runtime/local.js';
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
  loadJsonConfig: jest.fn(async () => ({ version: 4, flows: {} })),
  collectKnownSecrets: jest.fn(() => []),
}));

jest.mock('@walkeros/core', () => ({
  isObject: jest.requireActual('@walkeros/core').isObject,
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
  mcpError: jest.fn((error) => {
    const structured = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(structured) }],
      structuredContent: structured,
      isError: true,
    };
  }),
}));

import { collectKnownSecrets, loadJsonConfig, push } from '@walkeros/cli';
import type { PushResult } from '@walkeros/cli';
const mockPush = jest.mocked(push);
const mockCollectKnownSecrets = jest.mocked(collectKnownSecrets);
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

describe('flow_push tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowPushTool(server as any, createLocalRuntime());
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
    mockPush.mockResolvedValue({ success: true, duration: 0 });

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

  describe('known secrets', () => {
    const TOKEN = 'tok-flow-known-3b9f';
    const input = {
      configPath: './flow.json',
      event: { name: 'page view' },
    };

    beforeEach(() => {
      mockCollectKnownSecrets.mockReturnValue([TOKEN]);
    });

    afterEach(() => {
      mockCollectKnownSecrets.mockReturnValue([]);
    });

    it.each<[string, PushResult, PushResult]>([
      [
        'a network call url',
        {
          success: true,
          duration: 5,
          networkCalls: [
            {
              type: 'fetch',
              url: `https://vendor.test/${TOKEN}/collect`,
              timestamp: 1,
            },
          ],
        },
        {
          success: true,
          duration: 5,
          networkCalls: [
            {
              type: 'fetch',
              url: 'https://vendor.test/***/collect',
              timestamp: 1,
            },
          ],
        },
      ],
      [
        'a network call header',
        {
          success: true,
          duration: 5,
          networkCalls: [
            {
              type: 'fetch',
              url: 'https://vendor.test/collect',
              headers: { 'X-Key': TOKEN },
              timestamp: 1,
            },
          ],
        },
        {
          success: true,
          duration: 5,
          networkCalls: [
            {
              type: 'fetch',
              url: 'https://vendor.test/collect',
              headers: { 'X-Key': '***' },
              timestamp: 1,
            },
          ],
        },
      ],
      [
        'a vendor response',
        {
          success: true,
          duration: 5,
          elbResult: {
            ok: true,
            done: { api: { type: 'api', data: { echo: `key ${TOKEN}` } } },
          },
        },
        {
          success: true,
          duration: 5,
          elbResult: {
            ok: true,
            done: { api: { type: 'api', data: { echo: 'key ***' } } },
          },
        },
      ],
    ])('masks the known value in %s', async (_label, pushed, masked) => {
      mockPush.mockResolvedValue(pushed);

      const result = await server.getTool('flow_push').handler(input);

      expect(mockLoadJsonConfig).toHaveBeenCalledWith('./flow.json');
      expect(result.structuredContent).toEqual(masked);
      expect(JSON.parse(result.content[0].text)).toEqual(masked);
      expect(result.isError).toBeUndefined();
    });

    it('masks a URL-encoded known value in a network call url', async () => {
      const secret = 'ab+cd/ef==gh';
      mockCollectKnownSecrets.mockReturnValue([secret]);
      mockPush.mockResolvedValue({
        success: true,
        duration: 5,
        networkCalls: [
          {
            type: 'fetch',
            url: `https://vendor.test/${encodeURIComponent(secret)}/collect`,
            timestamp: 1,
          },
        ],
      });

      const result = await server.getTool('flow_push').handler(input);

      expect(result.structuredContent.networkCalls[0].url).toBe(
        'https://vendor.test/***/collect',
      );
    });

    it('masks credential fields by pattern', async () => {
      mockCollectKnownSecrets.mockReturnValue([]);
      mockPush.mockResolvedValue({
        success: true,
        duration: 5,
        networkCalls: [
          {
            type: 'fetch',
            url: 'https://vendor.test/collect',
            headers: { Authorization: 'Bearer abcdefghijklmnopqrstu' },
            timestamp: 1,
          },
        ],
      });

      const result = await server.getTool('flow_push').handler(input);

      expect(result.structuredContent.networkCalls[0].headers).toEqual({
        Authorization: '***',
      });
    });

    it('keeps the result structured for a numeric known secret', async () => {
      mockCollectKnownSecrets.mockReturnValue(['12345678']);
      mockPush.mockResolvedValue({
        success: true,
        duration: 5,
        elbResult: {
          ok: true,
          done: { api: { type: 'api', data: { account: 12345678 } } },
        },
      });

      const result = await server.getTool('flow_push').handler(input);

      expect(result.structuredContent).toEqual({
        success: true,
        duration: 5,
        elbResult: {
          ok: true,
          done: { api: { type: 'api', data: { account: '***' } } },
        },
      });
    });

    it('masks the known value in a failed push error', async () => {
      mockPush.mockResolvedValue({
        success: false,
        duration: 5,
        error: `rejected ${TOKEN}`,
      });

      const result = await server.getTool('flow_push').handler(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{"error":"rejected ***"}');
      expect(result.structuredContent).toEqual({ error: 'rejected ***' });
    });

    it('masks the known value in a thrown error', async () => {
      mockPush.mockRejectedValue(new Error(`cannot reach ${TOKEN}`));

      const result = await server.getTool('flow_push').handler(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{"error":"cannot reach ***"}');
      expect(result.structuredContent).toEqual({ error: 'cannot reach ***' });
    });
  });
});
