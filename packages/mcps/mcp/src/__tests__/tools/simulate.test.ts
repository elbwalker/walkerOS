import { z } from 'zod';
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

  it('registers step as a required (non-optional) zod string', () => {
    const tool = server.getTool('flow_simulate');
    const config = tool.config as { inputSchema: { step: z.ZodType } };
    const stepSchema = config.inputSchema.step;

    // A required string accepts a string but rejects undefined.
    expect(stepSchema.safeParse('destination.gtag').success).toBe(true);
    expect(stepSchema.safeParse(undefined).success).toBe(false);
    expect(stepSchema.isOptional()).toBe(false);
  });

  it('summarizes a destination result keyed by result name', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [{ fn: 'window.gtag', args: ['event', 'page_view'], ts: 1 }],
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
      '1/1 destinations received the event',
    );
    expect(result.structuredContent.destinations.gtag.received).toBe(true);
    expect(result.structuredContent.destinations.gtag.calls).toBe(1);
    expect(result.structuredContent.duration).toBe(42);
    expect(result.isError).toBeUndefined();
  });

  it('returns all calls in payload when verbose', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [
        { fn: 'window.gtag', args: ['config', 'G-TEST123', {}], ts: 1 },
        {
          fn: 'window.gtag',
          args: ['event', 'purchase', { value: 99, currency: 'EUR' }],
          ts: 2,
        },
      ],
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
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [{ fn: 'window.gtag', args: ['event', 'page_view'], ts: 1 }],
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
      step: 'destination',
      name: 'ga4',
      events: [],
      calls: [],
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

  it('proceeds past the step guard when step is present', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
      duration: 10,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    // No "step is required" guard hit; the destination simulate ran.
    expect(result.isError).toBeUndefined();
    expect(mockSimulateDestination).toHaveBeenCalled();
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
      step: 'source',
      name: 'browser',
      events: [{ name: 'cta click', data: { label: 'Sign Up' } }],
      calls: [],
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
      step: 'transformer',
      name: 'demo',
      events: [{ name: 'page view', data: { title: 'Home' } }],
      calls: [],
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
    expect(result.structuredContent.capturedEvents).toHaveLength(1);

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

  it('reports received: false when destination makes no calls', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
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
      '0/1 destinations received the event',
    );
    expect(result.structuredContent.destinations.gtag.received).toBe(false);
    expect(result.structuredContent.destinations.gtag.calls).toBe(0);
  });

  it('warns when destination receives no calls', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
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

  it('surfaces step error message from result.error', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
      duration: 20,
      error: new Error('mapping threw'),
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.structuredContent.success).toBe(false);
    expect(result.structuredContent.error).toBe('mapping threw');
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

  it('returns require hint when destination not found in collector', async () => {
    mockSimulateDestination.mockRejectedValue(
      new Error('Destination "gtag" not found in collector. Available: none'),
    );

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('not found in collector');
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
