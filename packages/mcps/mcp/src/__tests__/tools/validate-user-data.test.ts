import { createLocalRuntime } from '../../runtime/local.js';
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
  // The local runtime resolves the input through this loader first.
  loadJsonConfig: jest.fn(async (input: string) => JSON.parse(input)),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createFlowValidateToolSpec } from '../../tools/validate';
import { structured, rows, str } from '../support/tool-result.js';
import { validate } from '@walkeros/cli';

const mockValidate = jest.mocked(validate);

describe('flow_validate leaves issue messages literal', () => {
  beforeEach(() => {
    mockValidate.mockReset();
  });

  it('keeps error/warning messages literal, exactly like path (tool-generated, not user input)', async () => {
    mockValidate.mockResolvedValueOnce({
      valid: false,
      type: 'flow',
      errors: [
        { path: 'web.sources', message: 'expected object, got string' },
        { path: 'web.destinations', message: 'missing required key' },
      ],
      warnings: [{ path: 'web', message: 'deprecated shape; use v3' }],
      details: {},
    });

    const spec = createFlowValidateToolSpec(createLocalRuntime());
    const r = await spec.handler({
      type: 'flow',
      input: '{"bad": true}',
    });

    expect(structured(r).errors).toHaveLength(2);
    // Validation messages are tool-generated, not echoed user input — literal
    // like `path`, never wrapped in <user_data>.
    expect(rows(structured(r).errors)[0]?.message).toBe(
      'expected object, got string',
    );
    expect(str(rows(structured(r).errors)[0]?.message)).not.toContain(
      '<user_data>',
    );
    expect(rows(structured(r).errors)[1]?.message).toBe('missing required key');
    expect(rows(structured(r).warnings)[0]?.message).toBe(
      'deprecated shape; use v3',
    );
    expect(str(rows(structured(r).warnings)[0]?.message)).not.toContain(
      '<user_data>',
    );
    // paths stay literal too, so the LLM can reference them
    expect(rows(structured(r).errors)[0]?.path).toBe('web.sources');
  });

  it('leaves successful validation output alone (no error messages to wrap)', async () => {
    mockValidate.mockResolvedValueOnce({
      valid: true,
      type: 'flow',
      errors: [],
      warnings: [],
      details: {},
    });

    const spec = createFlowValidateToolSpec(createLocalRuntime());
    const r = await spec.handler({
      type: 'flow',
      input: '{}',
    });

    expect(structured(r).valid).toBe(true);
  });
});
