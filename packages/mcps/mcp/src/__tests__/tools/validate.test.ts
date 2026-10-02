import { createLocalRuntime } from '../../runtime/local.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createFlowValidateToolSpec,
  registerFlowValidateTool,
} from '../../tools/validate.js';
import { structured, record, rows, textOf } from '../support/tool-result.js';
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
    // The handler parses its input with the real schema.
    ValidateInputSchema:
      jest.requireActual<typeof import('@walkeros/cli/dev')>(
        '@walkeros/cli/dev',
      ).schemas.ValidateInputSchema,
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

describe('flow_validate tool', () => {
  let spec: ReturnType<typeof createFlowValidateToolSpec>;

  beforeEach(() => {
    spec = createFlowValidateToolSpec(createLocalRuntime());
    mockValidate.mockReset();
    // The local runtime resolves the input through the cli loader before
    // validating. Stand in for it: parse JSON, otherwise return a marker for
    // what reading that source would have produced.
    mockLoadJsonConfig.mockReset();
    mockLoadJsonConfig.mockImplementation(async (input: string) => {
      try {
        return JSON.parse(input);
      } catch {
        return { loadedFrom: input };
      }
    });
  });

  it('registers with correct name, title, and annotations', () => {
    expect(spec.name).toBe('flow_validate');
    expect(spec.title).toBe('Validate Flow');
    expect(spec.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    // The mocked input shape is not a zod shape, so the SDK's own
    // registration would reject it: capture the config without registering.
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const placeholder = new McpServer({
      name: 'scratch',
      version: '0.0.0',
    }).registerTool('placeholder', {}, () => ({ content: [] }));
    const registerTool = jest
      .spyOn(server, 'registerTool')
      .mockReturnValue(placeholder);
    registerFlowValidateTool(server, createLocalRuntime());
    const call: unknown[] = registerTool.mock.calls[0] ?? [];
    expect(record(call[1]).outputSchema).toBe(ValidateOutputShape);
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

    const result = await spec.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(mockValidate).toHaveBeenCalledWith(
      'event',
      { name: 'page view' },
      { flow: undefined, path: undefined },
    );
    expect(structured(result).valid).toBe(true);
    expect(structured(result).errors).toEqual([]);
    expect(record(result).isError).toBeUndefined();
  });

  it('resolves a file path through the runtime loader, then validates the document', async () => {
    const mockResult: ValidateResult = {
      valid: true,
      type: 'flow',
      errors: [],
      warnings: [],
      details: {},
    };
    mockValidate.mockResolvedValue(mockResult);

    await spec.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      flow: 'myFlow',
    });

    expect(mockLoadJsonConfig).toHaveBeenCalledWith('/path/to/flow.json');
    expect(mockValidate).toHaveBeenCalledWith(
      'flow',
      { loadedFrom: '/path/to/flow.json' },
      { flow: 'myFlow', path: undefined },
    );
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

    const result = await spec.handler({
      type: 'event',
      input: '{"name":"page view"}',
      flow: undefined,
    });

    expect(record(JSON.parse(textOf(result))).valid).toBe(true);
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

    const result = await spec.handler({
      type: 'event',
      input: '{"bad":"data"}',
      flow: undefined,
    });

    expect(record(JSON.parse(textOf(result))).valid).toBe(false);
  });

  it('returns isError on CLI failure', async () => {
    mockValidate.mockRejectedValue(new Error('Validation failed'));

    const result = await spec.handler({
      type: 'event',
      input: '{"name":"bad"}',
      flow: undefined,
    });

    expect(record(result).isError).toBe(true);
    const parsed = record(JSON.parse(textOf(result)));
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

    await spec.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      flow: undefined,
      path: 'destinations.snowplow',
    });

    expect(mockValidate).toHaveBeenCalledWith(
      'flow',
      { loadedFrom: '/path/to/flow.json' },
      { flow: undefined, path: 'destinations.snowplow' },
    );
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

    const result = await spec.handler({
      type: 'flow',
      input: '/path/to/flow.json',
      path: 'destinations.snowplow',
    });

    expect(structured(result).valid).toBe(true);
    expect(record(JSON.parse(textOf(result))).valid).toBe(true);
  });

  describe('step-entry error codes forward verbatim', () => {
    const stepEntryCodes = [
      'MISSING_PACKAGE',
      'OBSOLETE_CODE_STRING',
      'INVALID_IMPORT',
      'INVALID_CODE_SHAPE',
    ];

    it.each(stepEntryCodes)(
      'forwards %s code from CLI validator to MCP response',
      async (code) => {
        const mockResult: ValidateResult = {
          valid: false,
          type: 'flow',
          errors: [
            {
              path: 'flows.default.transformers.bad',
              message: `Invalid transformer entry (${code}).`,
              code,
            },
          ],
          warnings: [],
          details: {},
        };
        mockValidate.mockResolvedValue(mockResult);

        const result = await spec.handler({
          type: 'flow',
          input: '/path/to/flow.json',
          flow: undefined,
        });

        const parsed = record(JSON.parse(textOf(result)));
        expect(parsed.valid).toBe(false);
        expect(parsed.errors).toHaveLength(1);
        expect(rows(parsed.errors)[0]?.code).toBe(code);
      },
    );
  });

  describe('deprecated package detection: @walkeros/store-memory', () => {
    // DEPRECATED_PACKAGE is a cli check (validateFlow, a warning for one
    // minor); the real cli is exercised in validate-real.test.ts (F16).
    it('adds no private check: the cli verdict is returned unchanged', async () => {
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

      const result = await spec.handler({
        type: 'flow',
        input: JSON.stringify(flow),
        flow: undefined,
      });

      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toEqual([]);
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

      const result = await spec.handler({
        type: 'flow',
        input: JSON.stringify(flow),
        flow: undefined,
      });

      const parsed = record(JSON.parse(textOf(result)));
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

      const result = await spec.handler({
        type: 'event',
        input: '{"name":"page view"}',
        flow: undefined,
      });

      // The input is resolved once through the runtime loader; the deprecated
      // package pass adds no second load for a non-flow type.
      expect(mockLoadJsonConfig).toHaveBeenCalledTimes(1);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.valid).toBe(true);
    });

    it('surfaces the load error when a flow input cannot be loaded', async () => {
      mockLoadJsonConfig.mockRejectedValue(new Error('parse error'));

      const result = await spec.handler({
        type: 'flow',
        input: 'not json',
        flow: undefined,
      });

      expect(record(result).isError).toBe(true);
      expect(textOf(result)).toContain('parse error');
      expect(mockValidate).not.toHaveBeenCalled();
    });
  });
});
