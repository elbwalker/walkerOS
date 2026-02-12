import { registerSimulateTool } from '../../tools/simulate.js';
import { SimulateOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    SimulateInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli (dynamic import target)
const mockSimulate = jest.fn();
jest.mock('@walkeros/cli', () => ({
  simulate: mockSimulate,
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

describe('simulate tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerSimulateTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('simulate');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Simulate');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('simulate');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(SimulateOutputShape);
  });

  it('calls CLI simulate with parsed JSON event', async () => {
    const mockResult = { destinations: [], logs: [], stats: {} };
    mockSimulate.mockResolvedValue(mockResult);

    const tool = server.getTool('simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view","data":{"title":"Home"}}',
      flow: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view', data: { title: 'Home' } },
      { json: true, flow: undefined, platform: undefined },
    );
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
  });

  it('calls CLI simulate with string event (file path)', async () => {
    const mockResult = { destinations: [], logs: [] };
    mockSimulate.mockResolvedValue(mockResult);

    const tool = server.getTool('simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '/path/to/event.json',
      flow: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      '/path/to/event.json',
      { json: true, flow: undefined, platform: undefined },
    );
  });

  it('parses JSON array events', async () => {
    mockSimulate.mockResolvedValue({ results: [] });

    const tool = server.getTool('simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '[{"name":"page view"},{"name":"click button"}]',
      flow: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      [{ name: 'page view' }, { name: 'click button' }],
      { json: true, flow: undefined, platform: undefined },
    );
  });

  it('returns structured content on success', async () => {
    const mockResult = { destinations: ['ga4'], logs: ['processed 1 event'] };
    mockSimulate.mockResolvedValue(mockResult);

    const tool = server.getTool('simulate');
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
    mockSimulate.mockRejectedValue(new Error('Simulation failed'));

    const tool = server.getTool('simulate');
    const result = await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Simulation failed');
  });

  it('keeps invalid JSON as string event', async () => {
    mockSimulate.mockResolvedValue({ results: [] });

    const tool = server.getTool('simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{broken json',
      flow: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith('./flow.json', '{broken json', {
      json: true,
      flow: undefined,
      platform: undefined,
    });
  });

  it('passes flow parameter to CLI simulate', async () => {
    mockSimulate.mockResolvedValue({ success: true });

    const tool = server.getTool('simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: 'production',
      platform: undefined,
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      { json: true, flow: 'production', platform: undefined },
    );
  });

  it('passes platform parameter to CLI simulate', async () => {
    mockSimulate.mockResolvedValue({ success: true });

    const tool = server.getTool('simulate');
    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      flow: undefined,
      platform: 'server',
    });

    expect(mockSimulate).toHaveBeenCalledWith(
      './flow.json',
      { name: 'page view' },
      { json: true, flow: undefined, platform: 'server' },
    );
  });

  it('handles non-Error exceptions', async () => {
    mockSimulate.mockRejectedValue(42);

    const tool = server.getTool('simulate');
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
