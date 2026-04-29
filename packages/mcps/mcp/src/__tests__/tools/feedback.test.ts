// @ts-expect-error __VERSION__ is injected by tsup at build time
globalThis.__VERSION__ = '0.0.0-test';

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

import { registerFeedbackTool } from '../../tools/feedback.js';
import { stubClient } from '../support/stub-client.js';

type HandlerFn = (input: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: HandlerFn }> = {};
  return {
    registerTool(name: string, config: unknown, handler: HandlerFn) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('feedback tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  it('registers with correct name, title, and annotations', () => {
    registerFeedbackTool(server as never, stubClient());
    const tool = server.getTool('feedback');
    expect(tool).toBeDefined();
    const config = tool!.config as {
      title: string;
      annotations: Record<string, boolean>;
    };
    expect(config.title).toBe('Send Feedback');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('passes version to feedback function', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    await tool.handler({ text: 'Test feedback' });

    expect(submitFeedback).toHaveBeenCalledWith('Test feedback', {
      anonymous: true,
      version: '0.0.0-test',
    });
  });

  it('calls feedback with anonymous: true when preference is true', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({ text: 'Great tool!' })) as {
      structuredContent: { ok: boolean };
      content: Array<{ text: string }>;
    };

    expect(submitFeedback).toHaveBeenCalledWith('Great tool!', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });

  it('calls feedback with anonymous: false when preference is false', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => false,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({ text: 'Needs improvement' })) as {
      structuredContent: { ok: boolean };
    };

    expect(submitFeedback).toHaveBeenCalledWith('Needs improvement', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns consent prompt when preference is undefined and no anonymous param', async () => {
    const submitFeedback = jest.fn();
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => undefined,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({ text: 'Some feedback' })) as {
      structuredContent: { needsConsent: boolean; _hints: { next: string[] } };
    };

    expect(submitFeedback).not.toHaveBeenCalled();
    expect(result.structuredContent.needsConsent).toBe(true);
    expect(result.structuredContent._hints.next).toEqual([
      'Ask the user if they want to include their info',
      'Call feedback again with anonymous: true or false',
    ]);
  });

  it('calls feedback and stores preference when preference is undefined but anonymous param is provided', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const setFeedbackPreference = jest.fn();
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => undefined,
        setFeedbackPreference,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({
      text: 'Feedback with consent',
      anonymous: true,
    })) as { structuredContent: { ok: boolean } };

    expect(setFeedbackPreference).toHaveBeenCalledWith(true);
    expect(submitFeedback).toHaveBeenCalledWith('Feedback with consent', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns error on feedback failure', async () => {
    const submitFeedback = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({ text: 'Will fail' })) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Network error');
  });

  it('stores preference via CLI when no prior preference and anonymous param provided', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    const setFeedbackPreference = jest.fn();
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => undefined,
        setFeedbackPreference,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    const result = (await tool.handler({
      text: 'No config feedback',
      anonymous: false,
    })) as { structuredContent: { ok: boolean } };

    expect(setFeedbackPreference).toHaveBeenCalledWith(false);
    expect(submitFeedback).toHaveBeenCalledWith('No config feedback', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('uses explicit anonymous override even when preference is stored', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    registerFeedbackTool(
      server as never,
      stubClient({
        getFeedbackPreference: () => true,
        submitFeedback,
      }),
    );

    const tool = server.getTool('feedback')!;
    await tool.handler({ text: 'Override test', anonymous: false });

    expect(submitFeedback).toHaveBeenCalledWith('Override test', {
      anonymous: false,
      version: '0.0.0-test',
    });
  });
});
