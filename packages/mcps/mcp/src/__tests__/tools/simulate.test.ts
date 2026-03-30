import { registerFlowSimulateTool } from '../../tools/simulate.js';
import { SimulateOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    SimulateInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
      step: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli (dynamic import target)
jest.mock('@walkeros/cli', () => ({
  push: jest.fn(),
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

describe('flow_simulate tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowSimulateTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_simulate');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Simulate Flow');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('flow_simulate');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(SimulateOutputShape);
  });

  it('summarizes per-destination results', async () => {
    mockPush.mockResolvedValue({
      success: true,
      usage: {
        gtag: [{ fn: 'event', args: ['page_view'], ts: 1 }],
        meta: [],
      },
      duration: 42,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      '1/2 destinations received the event',
    );
    expect(result.structuredContent.destinations.gtag.received).toBe(true);
    expect(result.structuredContent.destinations.gtag.calls).toBe(1);
    expect(result.structuredContent.destinations.meta.received).toBe(false);
    expect(result.structuredContent.destinations.meta.calls).toBe(0);
    expect(result.structuredContent.duration).toBe(42);
    expect(result.isError).toBeUndefined();
  });

  it('passes parameters to CLI push with simulate array', async () => {
    mockPush.mockResolvedValue({ success: true, usage: {}, duration: 10 });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: 'server',
      step: 'destination.ga4',
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      '{"name":"page view"}',
      {
        json: true,
        flow: 'production',
        platform: 'server',
        simulate: ['destination.ga4'],
      },
    );
  });

  it('passes undefined simulate when no step provided', async () => {
    mockPush.mockResolvedValue({ success: true, usage: {}, duration: 10 });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      platform: undefined,
      step: undefined,
    });

    expect(mockPush).toHaveBeenCalledWith(
      './flow.json',
      '{"name":"page view"}',
      {
        json: true,
        flow: undefined,
        platform: undefined,
        simulate: undefined,
      },
    );
  });

  it('returns isError on CLI failure', async () => {
    mockPush.mockRejectedValue(new Error('Push failed'));

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Push failed');
  });

  it('errors when event is not provided', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: undefined,
      flow: undefined,
      platform: undefined,
      step: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('event is required');
  });

  it('returns capturedEvents for source simulation', async () => {
    mockPush.mockResolvedValue({
      success: true,
      captured: [
        { event: { name: 'cta click', data: { label: 'Sign Up' } }, timestamp: 1 },
      ],
      duration: 15,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: {
        content: '<button>Sign Up</button>',
        trigger: { type: 'click' },
      },
      flow: undefined,
      platform: undefined,
      step: 'source.browser',
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe('Source captured 1 event');
    expect(result.structuredContent.capturedEvents).toHaveLength(1);
  });

  it('handles simulation with no usage data', async () => {
    mockPush.mockResolvedValue({ success: true, duration: 10 });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      '0/0 destinations received the event',
    );
    expect(result.structuredContent.destinations).toBeUndefined();
  });

  it('warns when 0/0 destinations received event', async () => {
    mockPush.mockResolvedValue({
      success: true,
      usage: {},
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.structuredContent._hints?.warnings).toBeDefined();
    expect(result.structuredContent._hints.warnings.length).toBeGreaterThan(0);
  });

  it('warns when destinations exist but none received event', async () => {
    mockPush.mockResolvedValue({
      success: true,
      usage: {
        gtag: [],
        meta: [],
      },
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.structuredContent._hints?.warnings).toBeDefined();
    expect(result.structuredContent._hints.warnings[0]).toContain(
      'No destinations received the event',
    );
  });

  it('handles non-Error exceptions', async () => {
    mockPush.mockRejectedValue(42);

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Unknown error');
  });

  it('uses elbResult.done as fallback when no usage data', async () => {
    mockPush.mockResolvedValue({
      success: true,
      elbResult: {
        done: {
          gtag: { id: '123' },
        },
      } as any,
      duration: 20,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      '1/1 destinations received the event',
    );
    expect(result.structuredContent.destinations.gtag.received).toBe(true);
    expect(result.structuredContent.destinations.gtag.calls).toBe(0);
  });
});
