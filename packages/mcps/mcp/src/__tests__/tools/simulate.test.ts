import { registerFlowSimulateTool } from '../../tools/simulate.js';
import { SimulateOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    SimulateInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
      platform: { type: 'string' },
      step: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli simulate functions
jest.mock('@walkeros/cli', () => ({
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateDestination: jest.fn(),
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

import {
  simulateSource,
  simulateTransformer,
  simulateDestination,
} from '@walkeros/cli';
const mockSimulateSource = jest.mocked(simulateSource);
const mockSimulateTransformer = jest.mocked(simulateTransformer);
const mockSimulateDestination = jest.mocked(simulateDestination);

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
    jest.clearAllMocks();
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
    mockSimulateDestination.mockResolvedValue({
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
      step: 'destination.gtag',
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

  it('returns all calls in payload when verbose', async () => {
    mockSimulateDestination.mockResolvedValue({
      success: true,
      usage: {
        gtag: [
          { fn: 'window.gtag', args: ['config', 'G-TEST123', {}], ts: 1 },
          {
            fn: 'window.gtag',
            args: ['event', 'purchase', { value: 99, currency: 'EUR' }],
            ts: 2,
          },
        ],
      },
      duration: 50,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"order complete"}',
      flow: undefined,
      verbose: true,
      step: 'destination.gtag',
    });

    expect(result.structuredContent.destinations.gtag.calls).toBe(2);

    // payload contains ALL calls, not just the last one
    const payload = result.structuredContent.destinations.gtag.payload;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(2);
    expect(payload[0].args[0]).toBe('config');
    expect(payload[1].args[0]).toBe('event');
    expect(payload[1].args[1]).toBe('purchase');
    expect(payload[1].args[2]).toEqual({ value: 99, currency: 'EUR' });
  });

  it('omits payload when not verbose', async () => {
    mockSimulateDestination.mockResolvedValue({
      success: true,
      usage: {
        gtag: [{ fn: 'window.gtag', args: ['event', 'page_view'], ts: 1 }],
      },
      duration: 10,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      verbose: false,
      step: 'destination.gtag',
    });

    expect(result.structuredContent.destinations.gtag.calls).toBe(1);
    expect(result.structuredContent.destinations.gtag.payload).toBeUndefined();
  });

  it('passes parameters to simulateDestination with destinationId', async () => {
    mockSimulateDestination.mockResolvedValue({
      success: true,
      usage: {},
      duration: 10,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: 'server',
      step: 'destination.ga4',
    });

    expect(mockSimulateDestination).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        destinationId: 'ga4',
        flow: 'production',
        silent: true,
      },
    );
  });

  it('errors when step is not provided', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      platform: undefined,
      step: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('step is required');
  });

  it('returns isError when simulateDestination rejects', async () => {
    mockSimulateDestination.mockRejectedValue(new Error('Destination failed'));

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Destination failed');
  });

  it('returns isError when simulateSource rejects', async () => {
    mockSimulateSource.mockRejectedValue(new Error('Source failed'));

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { content: '<button>Click</button>' },
      flow: undefined,
      step: 'source.browser',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Source failed');
  });

  it('errors when event is not provided', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: undefined,
      flow: undefined,
      platform: undefined,
      step: 'destination.gtag',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('event is required');
  });

  it('returns capturedEvents for source simulation', async () => {
    mockSimulateSource.mockResolvedValue({
      success: true,
      captured: [
        {
          event: { name: 'cta click', data: { label: 'Sign Up' } },
          timestamp: 1,
        },
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

    expect(mockSimulateSource).toHaveBeenCalledWith(
      './flow.json',
      {
        content: '<button>Sign Up</button>',
        trigger: { type: 'click' },
      },
      {
        sourceId: 'browser',
        flow: undefined,
        silent: true,
      },
    );
  });

  it('calls simulateTransformer for transformer step', async () => {
    mockSimulateTransformer.mockResolvedValue({
      success: true,
      duration: 8,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'transformer.demo',
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      'Transformer processed event',
    );

    expect(mockSimulateTransformer).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        transformerId: 'demo',
        flow: undefined,
        silent: true,
      },
    );
  });

  it('handles simulation with no usage data', async () => {
    mockSimulateDestination.mockResolvedValue({
      success: true,
      duration: 10,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      '0/0 destinations received the event',
    );
    expect(result.structuredContent.destinations).toBeUndefined();
  });

  it('warns when destination step yields 0 destinations', async () => {
    mockSimulateDestination.mockResolvedValue({
      success: true,
      usage: {},
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.structuredContent._hints?.warnings).toBeDefined();
    expect(result.structuredContent._hints.warnings.length).toBeGreaterThan(0);
  });

  it('does not warn when destinations exist but none received event', async () => {
    mockSimulateDestination.mockResolvedValue({
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
      step: 'destination.gtag',
    });

    // Warning only fires when destCount === 0, not when destinations exist but are empty
    expect(result.structuredContent.summary).toBe(
      '0/2 destinations received the event',
    );
    expect(result.structuredContent._hints?.warnings).toBeUndefined();
  });

  it('handles non-Error exceptions', async () => {
    mockSimulateDestination.mockRejectedValue(42);

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Unknown error');
  });

  it('uses elbResult.done as fallback when no usage data', async () => {
    mockSimulateDestination.mockResolvedValue({
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
      step: 'destination.gtag',
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe(
      '1/1 destinations received the event',
    );
    expect(result.structuredContent.destinations.gtag.received).toBe(true);
    expect(result.structuredContent.destinations.gtag.calls).toBe(0);
  });

  it('errors on invalid step format without dot separator', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'nodot',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Invalid step format');
  });

  it('errors on unknown step type', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'unknown.thing',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Unknown step type');
  });

  it('errors on invalid JSON event string', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: 'not-valid-json',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Event string must be valid JSON');
  });
});
