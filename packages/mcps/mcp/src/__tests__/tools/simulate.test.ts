import { createLocalRuntime } from '../../runtime/local.js';
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

// Mock @walkeros/cli simulate functions. `bundle` writes the requested output
// so the prebuilt-bundle cache resolves a real path; the simulate fns then
// receive it as `bundlePath`.
jest.mock('@walkeros/cli', () => ({
  bundle: jest.fn(
    async (
      _config: unknown,
      options: { buildOverrides?: { output?: string } },
    ) => {
      const output = options.buildOverrides?.output;
      if (output) {
        const fs = await import('node:fs/promises');
        await fs.writeFile(output, '// stub bundle', 'utf-8');
      }
      return undefined;
    },
  ),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateDestination: jest.fn(),
  simulateCollector: jest.fn(),
  loadJsonConfig: jest.fn(async () => ({ version: 4, flows: {} })),
  collectKnownSecrets: jest.fn(() => []),
  // The real masker, from its own module (the cli entry does not load under
  // this suite): it is pure, and the egress tests depend on it.
  maskKnownNumbers: jest.requireActual(
    '../../../../../cli/src/core/known-secrets',
  ).maskKnownNumbers,
}));

jest.mock('@walkeros/core', () => ({
  // The real narrowing helper: cloud-id resolution reads the flow record through it.
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

import {
  collectKnownSecrets,
  simulateSource,
  simulateTransformer,
  simulateDestination,
  simulateCollector,
} from '@walkeros/cli';
import { stubClient } from '../support/stub-client.js';
import type { Simulation } from '@walkeros/core';
const mockSimulateSource = jest.mocked(simulateSource);
const mockSimulateTransformer = jest.mocked(simulateTransformer);
const mockSimulateDestination = jest.mocked(simulateDestination);
const mockSimulateCollector = jest.mocked(simulateCollector);
const mockCollectKnownSecrets = jest.mocked(collectKnownSecrets);

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

/** One field of a registered tool's input schema, narrowed without a cast. */
function inputSchemaField(config: unknown, key: string): z.ZodType {
  if (typeof config !== 'object' || config === null)
    throw new Error('tool config is not an object');
  const inputSchema: unknown = Object.entries(config).find(
    ([name]) => name === 'inputSchema',
  )?.[1];
  if (typeof inputSchema !== 'object' || inputSchema === null)
    throw new Error('tool config has no inputSchema');
  const field: unknown = Object.entries(inputSchema).find(
    ([name]) => name === key,
  )?.[1];
  if (!(field instanceof z.ZodType))
    throw new Error(`inputSchema.${key} is not a zod schema`);
  return field;
}

describe('flow_simulate tool', () => {
  let server: ReturnType<typeof createMockServer>;
  let getFlow: jest.Mock;

  beforeEach(() => {
    server = createMockServer();
    getFlow = jest.fn();
    registerFlowSimulateTool(
      server as any,
      stubClient({ getFlow }),
      createLocalRuntime(),
    );
    jest.clearAllMocks();
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_simulate');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Simulate Flow');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
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
        bundlePath: undefined,
        flow: 'production',
        silent: true,
      },
    );
  });

  it('resolves a cloud flow id (flow_…) via the client and passes config inline', async () => {
    const cloudConfig = { version: 4, flows: { default: {} } };
    getFlow.mockResolvedValue({ config: cloudConfig });
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: 'flow_abc123',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(getFlow).toHaveBeenCalledWith({ flowId: 'flow_abc123' });
    expect(mockSimulateDestination).toHaveBeenCalledWith(
      JSON.stringify(cloudConfig),
      { name: 'page view' },
      {
        destinationId: 'gtag',
        bundlePath: expect.any(String),
        flow: undefined,
        silent: true,
      },
    );
  });

  it('resolves a cloud config id (cfg_…) via the client for a source step', async () => {
    const cloudConfig = { version: 4, flows: { default: {} } };
    getFlow.mockResolvedValue({ config: cloudConfig });
    mockSimulateSource.mockResolvedValue({
      step: 'source',
      name: 'demo',
      events: [],
      calls: [],
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: 'cfg_xyz789',
      event: '{"content":{"name":"page view"}}',
      flow: undefined,
      step: 'source.demo',
    });

    expect(getFlow).toHaveBeenCalledWith({ flowId: 'cfg_xyz789' });
    expect(mockSimulateSource).toHaveBeenCalledWith(
      JSON.stringify(cloudConfig),
      { content: { name: 'page view' } },
      {
        sourceId: 'demo',
        bundlePath: expect.any(String),
        flow: undefined,
        silent: true,
      },
    );
  });

  it('passes a local file path through unchanged (no client call)', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtag',
      events: [],
      calls: [],
      duration: 5,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'destination.gtag',
    });

    expect(getFlow).not.toHaveBeenCalled();
    expect(mockSimulateDestination).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      {
        destinationId: 'gtag',
        bundlePath: undefined,
        flow: undefined,
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
    expect(result.structuredContent.summary).toBe(
      'Source captured 1 event and 0 commands',
    );
    expect(result.structuredContent.capturedEvents).toHaveLength(1);

    expect(mockSimulateSource).toHaveBeenCalledWith(
      './flow.json',
      {
        content: '<button>Sign Up</button>',
        trigger: { type: 'click' },
      },
      {
        sourceId: 'browser',
        bundlePath: undefined,
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
        bundlePath: undefined,
        flow: undefined,
        silent: true,
        ingest: undefined,
      },
    );
  });

  it('forwards ingest into simulateTransformer for transformer step', async () => {
    mockSimulateTransformer.mockResolvedValue({
      step: 'transformer',
      name: 'decoder',
      events: [{ name: 'page view', data: {} }],
      calls: [],
      duration: 4,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'transformer.decoder',
      ingest: { url: 'https://example.com/collect?v=2' },
    });

    expect(mockSimulateTransformer).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      expect.objectContaining({
        transformerId: 'decoder',
        ingest: { url: 'https://example.com/collect?v=2' },
      }),
    );
  });

  it.each([
    ['destination', 'destination.meta', mockSimulateDestination],
    ['collector', 'collector.default', mockSimulateCollector],
  ])(
    'forwards ingest into the %s simulation',
    async (stepType, step, mocked) => {
      mocked.mockResolvedValue({
        step: stepType === 'destination' ? 'destination' : 'collector',
        name: step.split('.')[1],
        events: [],
        calls: [],
        duration: 1,
      });

      const tool = server.getTool('flow_simulate');
      await tool.handler({
        configPath: './flow.json',
        event: '{"name":"page view"}',
        step,
        ingest: { userAgent: 'Mozilla/5.0 test' },
      });

      expect(mocked).toHaveBeenCalledWith(
        './flow.json',
        { name: 'page view' },
        expect.objectContaining({ ingest: { userAgent: 'Mozilla/5.0 test' } }),
      );
    },
  );

  it('scrubs secrets from an error it returns', async () => {
    const token =
      'EAABsbCS1iHgBAKZCZBqwZDZDq7xQ9kLmN3pRsT5vWyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
    mockSimulateDestination.mockRejectedValue(
      new Error(
        `request to https://graph.facebook.com/v19.0/1/events?access_token=${token} failed`,
      ),
    );

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"order complete"}',
      step: 'destination.meta',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain(token);
    expect(result.content[0].text).toContain('graph.facebook.com');
    expect(JSON.stringify(result.structuredContent)).not.toContain(token);
  });

  it('scrubs secrets from the recorded calls it returns', async () => {
    const privateKey =
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n';
    const metaToken =
      'EAABsbCS1iHgBAKZCZBqwZDZDq7xQ9kLmN3pRsT5vWyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
    const bearerToken = 'a8Kf3Lq9Zx2Mv7Np4Rt6Yw1Bc5Hd0Gj8Sk3Tu9Ve';
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'meta',
      events: [],
      calls: [
        {
          fn: 'BigQuery',
          args: [
            {
              credentials: {
                private_key: privateKey,
                client_email: 'svc@my-proj.iam.gserviceaccount.com',
                private_key_id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
              },
            },
          ],
          ts: 1,
        },
        {
          fn: 'sendServer',
          args: [
            `https://graph.facebook.com/v19.0/1/events?access_token=${metaToken}`,
            '{"event_name":"order complete"}',
            { headers: { Authorization: `Bearer ${bearerToken}` } },
          ],
          ts: 2,
        },
      ],
      duration: 3,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"order complete"}',
      step: 'destination.meta',
      verbose: true,
    });

    const text = result.content[0].text;
    for (const secret of [
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      'svc@my-proj.iam.gserviceaccount.com',
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      metaToken,
      bearerToken,
    ]) {
      expect(text).not.toContain(secret);
      expect(JSON.stringify(result.structuredContent)).not.toContain(secret);
    }
    expect(text).toContain('graph.facebook.com/v19.0/1/events');
    expect(text).toContain('order complete');
  });

  it('forwards state into simulateCollector for collector step', async () => {
    mockSimulateCollector.mockResolvedValue({
      step: 'collector',
      name: 'default',
      events: [{ name: 'page view', data: {} }],
      calls: [],
      duration: 6,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      step: 'collector.default',
      state: { consent: { marketing: true } },
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.summary).toBe('Collector enriched event');
    expect(result.structuredContent.capturedEvents).toHaveLength(1);

    expect(mockSimulateCollector).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      expect.objectContaining({
        collectorName: 'default',
        state: { consent: { marketing: true } },
      }),
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

  it('reports a missing destination without pointing at require', async () => {
    mockSimulateDestination.mockRejectedValue(
      new Error('Destination "gtag" not found in collector. Available: ga4'),
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
    expect(result.content[0].text).not.toContain('require');
  });

  it('forwards state.consent and command to a destination step', async () => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'ga4',
      events: [],
      calls: [{ fn: 'window.gtag', args: ['consent', 'update', {}], ts: 1 }],
      duration: 4,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: { marketing: true },
      step: 'destination.ga4',
      state: { consent: { functional: true } },
      command: 'consent',
    });

    expect(mockSimulateDestination).toHaveBeenCalledWith(
      './flow.json',
      { marketing: true },
      expect.objectContaining({
        destinationId: 'ga4',
        consent: { functional: true },
        command: 'consent',
      }),
    );
  });

  it('forwards state.consent to a transformer step', async () => {
    mockSimulateTransformer.mockResolvedValue({
      step: 'transformer',
      name: 'enrich',
      events: [{ name: 'page view' }],
      calls: [],
      duration: 2,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      step: 'transformer.enrich',
      state: { consent: { marketing: true } },
    });

    expect(mockSimulateTransformer).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      expect.objectContaining({
        transformerId: 'enrich',
        consent: { marketing: true },
      }),
    );
  });

  it('accepts only booleans in state.consent', () => {
    const tool = server.getTool('flow_simulate');
    const state = inputSchemaField(tool.config, 'state');

    expect(state.safeParse({ consent: { marketing: true } }).success).toBe(
      true,
    );
    expect(state.safeParse({ consent: { marketing: 'yes' } }).success).toBe(
      false,
    );
  });

  it('rejects command outside a destination step', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { marketing: true },
      step: 'transformer.enrich',
      command: 'consent',
    });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe(
      'command applies to destination steps only.',
    );
    expect(mockSimulateTransformer).not.toHaveBeenCalled();
  });

  it.each<[Simulation.Skipped, string]>([
    [
      { reason: 'pending', require: ['consent'] },
      'Destination waits for consent (require) and never started: pass state.consent (e.g. { functional: true }) to start it.',
    ],
    [
      { reason: 'pending', require: ['user'] },
      'Destination waits for user (require) and never started: it starts once the flow provides user; a simulation cannot seed that.',
    ],
    [
      {
        reason: 'consent',
        required: { marketing: true },
        granted: { functional: true, marketing: false },
      },
      "Consent skip: requires marketing; granted functional. Grant it in state.consent or in the event's consent.",
    ],
  ])('explains why nothing was sent: %j', async (skipped, warning) => {
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'gtm',
      events: [],
      calls: [],
      duration: 3,
      skipped,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { name: 'product add' },
      step: 'destination.gtm',
    });

    expect(result.structuredContent.skipped).toEqual(skipped);
    expect(result.structuredContent._hints.warnings).toEqual([warning]);
  });

  it('masks the values of the secrets the flow references', async () => {
    const token = 'tok-flow-known-3b9f';
    mockCollectKnownSecrets.mockReturnValueOnce([token]);
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'api',
      events: [],
      calls: [{ fn: 'sendServer', args: [{ auth: token }], ts: 1 }],
      duration: 3,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      step: 'destination.api',
      verbose: true,
    });

    expect(result.content[0].text).toContain('sendServer');
    expect(result.content[0].text).not.toContain(token);
    expect(JSON.stringify(result.structuredContent)).not.toContain(token);
  });

  it("shows a source's elb calls without verbose, mock-env calls only with it", async () => {
    mockSimulateSource.mockResolvedValue({
      step: 'source',
      name: 'usercentrics',
      events: [],
      calls: [
        { fn: 'elb', args: ['walker consent', { marketing: true }], ts: 1 },
        { fn: 'AWS.SQSClient.send', args: [{}], ts: 2 },
      ],
      duration: 4,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { content: {} },
      step: 'source.usercentrics',
    });

    expect(result.structuredContent.summary).toBe(
      'Source captured 0 events and 1 command',
    );
    expect(result.structuredContent.calls).toEqual([
      { fn: 'elb', args: ['walker consent', { marketing: true }], ts: 1 },
    ]);
  });

  it('forwards state.consent to a source step', async () => {
    mockSimulateSource.mockResolvedValue({
      step: 'source',
      name: 'session',
      events: [],
      calls: [],
      duration: 2,
    });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: { content: {} },
      step: 'source.session',
      state: { consent: { functional: true } },
    });

    expect(mockSimulateSource).toHaveBeenCalledWith(
      './flow.json',
      { content: {} },
      expect.objectContaining({
        sourceId: 'session',
        consent: { functional: true },
      }),
    );
  });

  it('returns a result whose numbers hold a known secret', async () => {
    mockCollectKnownSecrets.mockReturnValueOnce(['12345678']);
    mockSimulateDestination.mockResolvedValue({
      step: 'destination',
      name: 'api',
      events: [],
      calls: [{ fn: 'send', args: [{ account: 12345678 }], ts: 1 }],
      duration: 3,
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: { name: 'page view' },
      step: 'destination.api',
      verbose: true,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain('12345678');
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
