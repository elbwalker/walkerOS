import { registerValidateTool } from '../../tools/validate.js';
import { ValidateOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli/dev schemas
jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    ValidateInputShape: {
      type: { type: 'string' },
      input: { type: 'string' },
      flow: { type: 'string' },
    },
  },
}));

// Mock @walkeros/cli (dynamic import target)
jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
}));

import { validate } from '@walkeros/cli';
const mockValidate = jest.mocked(validate);

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

describe('validate tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerValidateTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('validate');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Validate');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('validate');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(ValidateOutputShape);
  });

  it('calls CLI validate with parsed JSON input', async () => {
    const mockResult = { valid: true, errors: [], warnings: [] };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(mockValidate).toHaveBeenCalledWith(
      'event',
      { name: 'page view' },
      { flow: undefined },
    );
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
  });

  it('calls CLI validate with string input (file path)', async () => {
    const mockResult = { valid: true, errors: [] };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('validate');
    await tool.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      flow: 'myFlow',
    });

    expect(mockValidate).toHaveBeenCalledWith('flow', '/path/to/flow.json', {
      flow: 'myFlow',
    });
  });

  it('returns structured content on success', async () => {
    const mockResult = { valid: true, details: { checked: 5 } };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(mockResult);
    expect(result.structuredContent).toEqual(mockResult);
    expect(result.isError).toBeUndefined();
  });

  it('returns isError on CLI failure', async () => {
    mockValidate.mockRejectedValue(new Error('Validation failed'));

    const tool = server.getTool('validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"bad"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.error).toBe('Validation failed');
  });

  it('keeps invalid JSON as string input', async () => {
    mockValidate.mockResolvedValue({ valid: true });

    const tool = server.getTool('validate');
    await tool.handler({
      type: 'event',
      input: '{not valid json',
      flow: undefined,
    });

    // Input starts with '{' but is not valid JSON, so stays as string
    expect(mockValidate).toHaveBeenCalledWith('event', '{not valid json', {
      flow: undefined,
    });
  });
});
