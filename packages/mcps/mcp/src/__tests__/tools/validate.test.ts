import { registerFlowValidateTool } from '../../tools/validate.js';
import { ValidateOutputShape } from '../../schemas/output.js';
import type { ValidateResult } from '@walkeros/cli';

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
  loadJsonConfig: jest.fn(),
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

import { validate, loadJsonConfig } from '@walkeros/cli';
const mockValidate = jest.mocked(validate);
const mockLoadJsonConfig = jest.mocked(loadJsonConfig);

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
    const mockResult: ValidateResult = {
      valid: true,
      type: 'event',
      errors: [],
      warnings: [],
      details: {},
    };
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
    expect(result.structuredContent.valid).toBe(true);
    expect(result.structuredContent.errors).toEqual([]);
    expect(result.isError).toBeUndefined();
  });

  it('passes file path string to validate', async () => {
    const mockResult: ValidateResult = {
      valid: true,
      type: 'flow',
      errors: [],
      warnings: [],
      details: {},
    };
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
    const mockResult: ValidateResult = {
      valid: true,
      type: 'event',
      errors: [],
      warnings: [],
      details: {},
    };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(JSON.parse(result.content[0].text).valid).toBe(true);
  });

  it('returns summary with error count on failure', async () => {
    const mockResult: ValidateResult = {
      valid: false,
      type: 'event',
      errors: [{ path: '/name', message: 'required' }],
      warnings: [],
      details: {},
    };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'event',
      input: '{"bad":"data"}',
      flow: undefined,
    });

    expect(JSON.parse(result.content[0].text).valid).toBe(false);
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
    const mockResult: ValidateResult = {
      valid: true,
      type: 'flow',
      errors: [],
      warnings: [],
      details: {},
    };
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

  it('accepts entry type in output when path is used', async () => {
    const mockResult: ValidateResult = {
      valid: true,
      type: 'entry',
      errors: [],
      warnings: [],
      details: { schema: 'destinations.snowplow' },
    };
    mockValidate.mockResolvedValue(mockResult);

    const tool = server.getTool('flow_validate');
    const result = await tool.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      path: 'destinations.snowplow',
    });

    expect(result.structuredContent.valid).toBe(true);
    expect(JSON.parse(result.content[0].text).valid).toBe(true);
  });

  describe('deprecated package detection: @walkeros/store-memory', () => {
    it('rejects flow.json declaring @walkeros/store-memory in a store', async () => {
      const flow = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            stores: {
              mem: { package: '@walkeros/store-memory', config: {} },
            },
          },
        },
      };
      const mockResult: ValidateResult = {
        valid: true,
        type: 'flow',
        errors: [],
        warnings: [],
        details: {},
      };
      mockValidate.mockResolvedValue(mockResult);
      mockLoadJsonConfig.mockResolvedValue(flow);

      const tool = server.getTool('flow_validate');
      const result = await tool.handler({
        type: 'flow',
        input: JSON.stringify(flow),
        flow: undefined,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(
        parsed.errors.some((e: { message: string }) =>
          /@walkeros\/store-memory/.test(e.message),
        ),
      ).toBe(true);
      expect(
        parsed.errors.some((e: { message: string }) =>
          /omit cache\.store|built-in cache/.test(e.message),
        ),
      ).toBe(true);
    });

    it('detects @walkeros/store-memory across multiple flows and stores', async () => {
      const flow = {
        version: 4,
        flows: {
          a: {
            config: { platform: 'server' },
            stores: {
              cache1: { package: '@walkeros/store-memory', config: {} },
              other: { package: '@walkeros/server-store-fs', config: {} },
            },
          },
          b: {
            config: { platform: 'server' },
            stores: {
              cache2: { package: '@walkeros/store-memory', config: {} },
            },
          },
        },
      };
      const mockResult: ValidateResult = {
        valid: true,
        type: 'flow',
        errors: [],
        warnings: [],
        details: {},
      };
      mockValidate.mockResolvedValue(mockResult);
      mockLoadJsonConfig.mockResolvedValue(flow);

      const tool = server.getTool('flow_validate');
      const result = await tool.handler({
        type: 'flow',
        input: JSON.stringify(flow),
        flow: undefined,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      const memoryErrors = parsed.errors.filter((e: { message: string }) =>
        /@walkeros\/store-memory/.test(e.message),
      );
      expect(memoryErrors.length).toBe(2);
      expect(
        parsed.errors.some((e: { path: string }) =>
          /flows\.a\.stores\.cache1/.test(e.path),
        ),
      ).toBe(true);
      expect(
        parsed.errors.some((e: { path: string }) =>
          /flows\.b\.stores\.cache2/.test(e.path),
        ),
      ).toBe(true);
    });

    it('passes a flow.json with no @walkeros/store-memory references', async () => {
      const flow = {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            stores: {
              fs: { package: '@walkeros/server-store-fs', config: {} },
            },
          },
        },
      };
      const mockResult: ValidateResult = {
        valid: true,
        type: 'flow',
        errors: [],
        warnings: [],
        details: {},
      };
      mockValidate.mockResolvedValue(mockResult);
      mockLoadJsonConfig.mockResolvedValue(flow);

      const tool = server.getTool('flow_validate');
      const result = await tool.handler({
        type: 'flow',
        input: JSON.stringify(flow),
        flow: undefined,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toEqual([]);
    });

    it('skips deprecated-package check for non-flow validation types', async () => {
      const mockResult: ValidateResult = {
        valid: true,
        type: 'event',
        errors: [],
        warnings: [],
        details: {},
      };
      mockValidate.mockResolvedValue(mockResult);

      const tool = server.getTool('flow_validate');
      const result = await tool.handler({
        type: 'event',
        input: '{"name":"page view"}',
        flow: undefined,
      });

      expect(mockLoadJsonConfig).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('skips deprecated-package check when input cannot be loaded', async () => {
      const mockResult: ValidateResult = {
        valid: false,
        type: 'flow',
        errors: [{ path: 'input', message: 'invalid json' }],
        warnings: [],
        details: {},
      };
      mockValidate.mockResolvedValue(mockResult);
      mockLoadJsonConfig.mockRejectedValue(new Error('parse error'));

      const tool = server.getTool('flow_validate');
      const result = await tool.handler({
        type: 'flow',
        input: 'not json',
        flow: undefined,
      });

      const parsed = JSON.parse(result.content[0].text);
      // existing errors preserved; no crash even though load failed
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0].path).toBe('input');
      expect(parsed.errors[0].message).toContain('invalid json');
    });
  });
});
