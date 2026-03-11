import { registerFlowValidateTool } from '../../tools/validate.js';
import { ValidateOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    ValidateInputShape: {
      type: { type: 'string' },
      input: { type: 'string' },
      flow: { type: 'string' },
      path: { type: 'string' },
    },
  },
}));

jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
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

describe('flow_validate tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowValidateTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_validate');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Validate Flow');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('flow_validate');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(ValidateOutputShape);
  });

  it('calls validate with correct params', async () => {
    const mockResult = { valid: true, errors: [], warnings: [] };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(mockValidate).toHaveBeenCalledWith('event', '{"name":"page view"}', {
      flow: undefined,
      path: undefined,
    });
    expect(result.structuredContent).toEqual(mockResult);
    expect(result.isError).toBeUndefined();
  });

  it('passes file path string to validate', async () => {
    const mockResult = { valid: true, errors: [] };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    await tool.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      flow: 'myFlow',
    });

    expect(mockValidate).toHaveBeenCalledWith('flow', '/path/to/flow.json', {
      flow: 'myFlow',
      path: undefined,
    });
  });

  it('returns summary "Valid" on success', async () => {
    const mockResult = { valid: true, errors: [], warnings: [] };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(result.content[0].text).toBe('Valid');
  });

  it('returns summary with error count on failure', async () => {
    const mockResult = {
      valid: false,
      errors: [{ path: '/name', message: 'required' }],
      warnings: [],
    };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"bad":"data"}',
      flow: undefined,
    });

    expect(result.content[0].text).toBe('Invalid: 1 errors, 0 warnings');
  });

  it('returns isError on CLI failure', async () => {
    mockValidate.mockRejectedValue(new Error('Validation failed'));

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"bad"}',
      flow: undefined,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Validation failed');
  });

  it('passes path option to CLI validate', async () => {
    const mockResult = { valid: true, errors: [], warnings: [], details: {} };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    await tool.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      flow: undefined,
      path: 'destinations.snowplow',
    });

    expect(mockValidate).toHaveBeenCalledWith('flow', '/path/to/flow.json', {
      flow: undefined,
      path: 'destinations.snowplow',
    });
  });
});
