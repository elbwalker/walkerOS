import { registerFlowSimulateTool } from '../../tools/simulate.js';
import { SimulateOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    SimulateInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
      example: { type: 'string' },
      step: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli (dynamic import target)
jest.mock('@walkeros/cli', () => ({
  simulate: jest.fn(),
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

import { simulate } from '@walkeros/cli';
const mockSimulate = jest.mocked(simulate);

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
    mockSimulate.mockResolvedValue({
      success: true,
      usage: {
        gtag: [{ path: 'gtag', args: ['event', 'page_view'] }],
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

  it('passes parameters to CLI simulate', async () => {
    mockSimulate.mockResolvedValue({ success: true, usage: {} });

    const tool = server.getTool('flow_simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: 'server',
      example: undefined,
      step: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      '{"name":"page view"}',
      {
        json: true,
        flow: 'production',
        platform: 'server',
        example: undefined,
        step: undefined,
      },
    );
  });

  it('returns isError on CLI failure', async () => {
    mockSimulate.mockRejectedValue(new Error('Simulation failed'));

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Simulation failed');
  });

  it('errors when neither event nor example is provided', async () => {
    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: undefined,
      flow: undefined,
      platform: undefined,
      example: undefined,
      step: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Either event or example must be provided');
  });

  it('passes example and step to CLI simulate', async () => {
    mockSimulate.mockResolvedValue({
      success: true,
      usage: { gtag: [{ path: 'gtag', args: ['event', 'purchase'] }] },
      exampleMatch: {
        name: 'purchase',
        step: 'destination.gtag',
        match: true,
      },
    });

    const tool = server.getTool('flow_simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: undefined,
      flow: undefined,
      platform: undefined,
      example: 'purchase',
      step: 'destination.gtag',
    });

    expect(mockSimulate).toHaveBeenCalledWith('./flow.json', undefined, {
      json: true,
      flow: undefined,
      platform: undefined,
      example: 'purchase',
      step: 'destination.gtag',
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.exampleMatch.match).toBe(true);
  });

  it('handles simulation with no usage data', async () => {
    mockSimulate.mockResolvedValue({ success: true });

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

  it('handles non-Error exceptions', async () => {
    mockSimulate.mockRejectedValue(42);

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
});
