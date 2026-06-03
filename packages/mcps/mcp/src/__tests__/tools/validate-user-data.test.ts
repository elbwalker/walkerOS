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

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createFlowValidateToolSpec } from '../../tools/validate';
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

    const spec = createFlowValidateToolSpec();
    const r = (await spec.handler({
      type: 'flow',
      input: '{"bad": true}',
    })) as {
      structuredContent: {
        errors: Array<{ path: string; message: string }>;
        warnings: Array<{ path: string; message: string }>;
      };
    };

    expect(r.structuredContent.errors).toHaveLength(2);
    // Validation messages are tool-generated, not echoed user input — literal
    // like `path`, never wrapped in <user_data>.
    expect(r.structuredContent.errors[0]!.message).toBe(
      'expected object, got string',
    );
    expect(r.structuredContent.errors[0]!.message).not.toContain('<user_data>');
    expect(r.structuredContent.errors[1]!.message).toBe('missing required key');
    expect(r.structuredContent.warnings[0]!.message).toBe(
      'deprecated shape; use v3',
    );
    expect(r.structuredContent.warnings[0]!.message).not.toContain(
      '<user_data>',
    );
    // paths stay literal too, so the LLM can reference them
    expect(r.structuredContent.errors[0]!.path).toBe('web.sources');
  });

  it('leaves successful validation output alone (no error messages to wrap)', async () => {
    mockValidate.mockResolvedValueOnce({
      valid: true,
      type: 'flow',
      errors: [],
      warnings: [],
      details: {},
    });

    const spec = createFlowValidateToolSpec();
    const r = (await spec.handler({
      type: 'flow',
      input: '{}',
    })) as { structuredContent: { valid: boolean } };

    expect(r.structuredContent.valid).toBe(true);
  });
});
