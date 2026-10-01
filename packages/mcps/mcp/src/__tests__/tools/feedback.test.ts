// __VERSION__ is injected by tsup at build time
Reflect.set(globalThis, '__VERSION__', '0.0.0-test');

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

import { createFeedbackToolSpec } from '../../tools/feedback.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  record,
  hintsOf,
  textOf,
  isErrorResult,
} from '../support/tool-result.js';

function parse(text: string): unknown {
  return JSON.parse(text);
}

describe('feedback tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with correct name, title, and annotations', () => {
    const spec = createFeedbackToolSpec(stubClient());
    expect(spec.name).toBe('feedback');
    expect(spec.title).toBe('Send Feedback');
    expect(spec.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('passes version to feedback function', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    await tool.handler({ text: 'Test feedback' });

    expect(submitFeedback).toHaveBeenCalledWith('Test feedback', {
      anonymous: true,
      version: '0.0.0-test',
    });
  });

  it('calls feedback with anonymous: true when preference is true', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const result = await tool.handler({ text: 'Great tool!' });

    expect(submitFeedback).toHaveBeenCalledWith('Great tool!', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(structured(result)).toEqual({ ok: true });
    expect(record(parse(textOf(result))).ok).toBe(true);
  });

  it('calls feedback with anonymous: false when preference is false', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => false,
        submitFeedback,
      }),
    );

    const result = await tool.handler({ text: 'Needs improvement' });

    expect(submitFeedback).toHaveBeenCalledWith('Needs improvement', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(structured(result)).toEqual({ ok: true });
  });

  it('returns consent prompt when preference is undefined and no anonymous param', async () => {
    const submitFeedback = jest.fn();
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => undefined,
        submitFeedback,
      }),
    );

    const result = await tool.handler({ text: 'Some feedback' });

    expect(submitFeedback).not.toHaveBeenCalled();
    expect(structured(result).needsConsent).toBe(true);
    expect(hintsOf(result)).toEqual([
      'Ask the user if they want to include their info',
      'Call feedback again with anonymous: true or false',
    ]);
  });

  it('calls feedback and stores preference when preference is undefined but anonymous param is provided', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const setFeedbackPreference = jest.fn();
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => undefined,
        setFeedbackPreference,
        submitFeedback,
      }),
    );

    const result = await tool.handler({
      text: 'Feedback with consent',
      anonymous: true,
    });

    expect(setFeedbackPreference).toHaveBeenCalledWith(true);
    expect(submitFeedback).toHaveBeenCalledWith('Feedback with consent', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(structured(result)).toEqual({ ok: true });
  });

  it('returns error on feedback failure', async () => {
    const submitFeedback = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const result = await tool.handler({ text: 'Will fail' });

    expect(isErrorResult(result)).toBe(true);
    expect(record(parse(textOf(result))).error).toBe('Network error');
  });

  it('stores preference via CLI when no prior preference and anonymous param provided', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const setFeedbackPreference = jest.fn();
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => undefined,
        setFeedbackPreference,
        submitFeedback,
      }),
    );

    const result = await tool.handler({
      text: 'No config feedback',
      anonymous: false,
    });

    expect(setFeedbackPreference).toHaveBeenCalledWith(false);
    expect(submitFeedback).toHaveBeenCalledWith('No config feedback', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(structured(result)).toEqual({ ok: true });
  });

  it('uses explicit anonymous override even when preference is stored', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const tool = createFeedbackToolSpec(
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    await tool.handler({ text: 'Override test', anonymous: false });

    expect(submitFeedback).toHaveBeenCalledWith('Override test', {
      anonymous: false,
      version: '0.0.0-test',
    });
  });
});
