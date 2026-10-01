import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createLocalRuntime } from '../../runtime/local.js';
import {
  createFlowPushToolSpec,
  registerFlowPushTool,
} from '../../tools/push.js';
import { PushOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli/dev', () => jest.requireActual('@walkeros/cli/dev'));

jest.mock('@walkeros/cli', () => ({
  push: jest.fn(),
  loadConfig: jest.fn(async () => '{"version":4,"flows":{}}'),
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

import { collectKnownSecrets, loadConfig, push } from '@walkeros/cli';
import type { PushResult } from '@walkeros/cli';
import { structured, record, rows, textOf } from '../support/tool-result.js';
const mockPush = jest.mocked(push);
const mockCollectKnownSecrets = jest.mocked(collectKnownSecrets);
const mockLoadConfig = jest.mocked(loadConfig);

describe('flow_push tool', () => {
  let spec: ReturnType<typeof createFlowPushToolSpec>;

  beforeEach(() => {
    spec = createFlowPushToolSpec(createLocalRuntime());
  });

  it('registers with correct name, title, and annotations', () => {
    expect(spec.name).toBe('flow_push');
    expect(spec.title).toBe('Push Events');
    expect(spec.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const registerTool = jest.spyOn(server, 'registerTool');
    registerFlowPushTool(server, createLocalRuntime());
    const call: unknown[] = registerTool.mock.calls[0] ?? [];
    expect(record(call[1]).outputSchema).toBe(PushOutputShape);
  });

  it('calls push with correct params', async () => {
    const mockResult = { success: true, duration: 120 };
    mockPush.mockResolvedValue(mockResult);

    const result = await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        json: true,
        flow: undefined,
        platform: undefined,
        raw: { version: 4, flows: {} },
      },
    );
    expect(structured(result)).toEqual(mockResult);
    expect(record(result).isError).toBeUndefined();
  });

  it('refuses an input that fails the schema without pushing', async () => {
    const result = await spec.handler({ event: {} });

    expect(record(result).isError).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reads the config once for a push', async () => {
    mockPush.mockResolvedValue({ success: true, duration: 1 });

    await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
    });

    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        json: true,
        flow: undefined,
        platform: undefined,
        raw: { version: 4, flows: {} },
      },
    );
  });

  it('refuses the push when the config cannot be read', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('fetch failed'));

    const result = await spec.handler({
      configPath: 'https://flows.test/flow.json',
      event: { name: 'page view' },
    });

    expect(record(result).isError).toBe(true);
    expect(structured(result)).toEqual({ error: 'fetch failed' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['./flow.mjs', './flow'])(
    'pushes the prebuilt bundle %s without a config',
    async (configPath) => {
      mockLoadConfig.mockResolvedValueOnce('export default {};');
      mockPush.mockResolvedValue({ success: true, duration: 1 });

      const result = await spec.handler({
        configPath,
        event: { name: 'page view' },
      });

      expect(record(result).isError).toBeUndefined();
      expect(mockPush).toHaveBeenCalledWith(
        configPath,
        { name: 'page view' },
        { json: true, flow: undefined, platform: undefined },
      );
    },
  );

  it('returns isError on CLI failure', async () => {
    mockPush.mockRejectedValue(new Error('Push failed'));

    const result = await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      flow: undefined,
    });

    expect(record(result).isError).toBe(true);
    const parsed = record(JSON.parse(textOf(result)));
    expect(parsed.error).toBe('Push failed');
  });

  it('passes flow and platform parameters', async () => {
    mockPush.mockResolvedValue({ success: true, duration: 0 });

    await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      flow: 'production',
      platform: 'server',
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        json: true,
        flow: 'production',
        platform: 'server',
        raw: { version: 4, flows: {} },
      },
    );
  });

  it('returns error when result.success is false', async () => {
    mockPush.mockResolvedValue({
      success: false,
      error: 'Connection refused',
      duration: 50,
    });

    const result = await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      flow: undefined,
    });

    expect(record(result).isError).toBe(true);
  });

  it('handles non-Error exceptions', async () => {
    mockPush.mockRejectedValue(42);

    const result = await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      flow: undefined,
    });

    expect(record(result).isError).toBe(true);
    const parsed = record(JSON.parse(textOf(result)));
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
            done: { api: { type: 'api', data: { echo: `seen ${TOKEN}` } } },
          },
        },
        {
          success: true,
          duration: 5,
          elbResult: {
            ok: true,
            done: { api: { type: 'api', data: { echo: 'seen ***' } } },
          },
        },
      ],
    ])('masks the known value in %s', async (_label, pushed, masked) => {
      mockPush.mockResolvedValue(pushed);

      const result = await spec.handler(input);

      expect(mockLoadConfig).toHaveBeenCalledWith('./flow.json', {
        json: false,
      });
      expect(structured(result)).toEqual(masked);
      expect(JSON.parse(textOf(result))).toEqual(masked);
      expect(record(result).isError).toBeUndefined();
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

      const result = await spec.handler(input);

      expect(rows(structured(result).networkCalls)[0]?.url).toBe(
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

      const result = await spec.handler(input);

      expect(rows(structured(result).networkCalls)[0]?.headers).toEqual({
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

      const result = await spec.handler(input);

      expect(structured(result)).toEqual({
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

      const result = await spec.handler(input);

      expect(record(result).isError).toBe(true);
      expect(textOf(result)).toBe('{"error":"rejected ***"}');
      expect(structured(result)).toEqual({ error: 'rejected ***' });
    });

    it('masks the known value in a thrown error', async () => {
      mockPush.mockRejectedValue(new Error(`cannot reach ${TOKEN}`));

      const result = await spec.handler(input);

      expect(record(result).isError).toBe(true);
      expect(textOf(result)).toBe('{"error":"cannot reach ***"}');
      expect(structured(result)).toEqual({ error: 'cannot reach ***' });
    });
  });
});

describe('flow_push on a runtime without loadRun', () => {
  it('masks the values its knownSecrets returns', async () => {
    const TOKEN = 'harbor-lantern-41';
    const spec = createFlowPushToolSpec({
      load: async () => ({}),
      knownSecrets: async () => [TOKEN],
      push: async () => ({
        success: true,
        duration: 1,
        elbResult: {
          ok: true,
          done: { api: { type: 'api', data: { echo: `seen ${TOKEN}` } } },
        },
      }),
    });

    const result = await spec.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
    });

    expect(result).toMatchObject({
      structuredContent: {
        elbResult: { done: { api: { data: { echo: 'seen ***' } } } },
      },
    });
  });
});
