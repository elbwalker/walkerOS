import { registerPushTool } from '../../tools/push.js';
import { PushOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    PushInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli (dynamic import target)
const mockPush = jest.fn();
jest.mock('@walkeros/cli', () => ({
  push: mockPush,
}));

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

describe('push tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerPushTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('push');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Push');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('push');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(PushOutputShape);
  });

  it('calls CLI push with parsed JSON event', async () => {
    const mockResult = { destinations: [], logs: [], stats: {} };
    mockPush.mockResolvedValue(mockResult);

    const tool = server.getTool('push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view","data":{"title":"Home"}}',
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view', data: { title: 'Home' } },
      { json: true, flow: undefined, platform: undefined },
    );
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
  });

  it('calls CLI push with string event (file path)', async () => {
    const mockResult = { destinations: [], logs: [] };
    mockPush.mockResolvedValue(mockResult);

    const tool = server.getTool('push');
    await tool.handler({
      configPath: './flow.json',
      event: '/path/to/event.json',
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      '/path/to/event.json',
      { json: true, flow: undefined, platform: undefined },
    );
  });

  it('parses JSON array events', async () => {
    mockPush.mockResolvedValue({ results: [] });

    const tool = server.getTool('push');
    await tool.handler({
      configPath: './flow.json',
      event: '[{"name":"page view"},{"name":"click button"}]',
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      [{ name: 'page view' }, { name: 'click button' }],
      { json: true, flow: undefined, platform: undefined },
    );
  });

  it('returns structured content on success', async () => {
    const mockResult = { destinations: ['ga4'], logs: ['processed 1 event'] };
    mockPush.mockResolvedValue(mockResult);

    const tool = server.getTool('push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    expect(result.structuredContent).toEqual(mockResult);
    expect(result.isError).toBeUndefined();
  });

  it('returns isError on CLI failure', async () => {
    mockPush.mockRejectedValue(new Error('Push failed'));

    const tool = server.getTool('push');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Push failed');
  });

  it('keeps invalid JSON as string event', async () => {
    mockPush.mockResolvedValue({ results: [] });

    const tool = server.getTool('push');
    await tool.handler({
      configPath: './flow.json',
      event: '{broken json',
      flow: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith('./flow.json', '{broken json', {
      json: true,
      flow: undefined,
      platform: undefined,
    });
  });

  it('passes flow parameter to CLI push', async () => {
    mockPush.mockResolvedValue({ success: true });

    const tool = server.getTool('push');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      { json: true, flow: 'production', platform: undefined },
    );
  });

  it('passes platform parameter to CLI push', async () => {
    mockPush.mockResolvedValue({ success: true });

    const tool = server.getTool('push');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      platform: 'server',
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      { json: true, flow: undefined, platform: 'server' },
    );
  });

  it('handles non-Error exceptions', async () => {
    mockPush.mockRejectedValue(42);

    const tool = server.getTool('push');
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
