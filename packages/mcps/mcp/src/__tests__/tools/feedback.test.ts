// @ts-expect-error — __VERSION__ is injected by tsup at build time
globalThis.__VERSION__ = '0.0.0-test';

import { registerFeedbackTool } from '../../tools/feedback.js';

jest.mock('@walkeros/cli', () => ({
  feedback: jest.fn(),
  getFeedbackPreference: jest.fn(),
  setFeedbackPreference: jest.fn(),
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

import {
  feedback,
  getFeedbackPreference,
  setFeedbackPreference,
} from '@walkeros/cli';
const mockFeedback = jest.mocked(feedback);
const mockGetPref = jest.mocked(getFeedbackPreference);
const mockSetPref = jest.mocked(setFeedbackPreference);

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

describe('feedback tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerFeedbackTool(server as any);
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('feedback');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Send Feedback');
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('passes version to feedback function', async () => {
    mockGetPref.mockReturnValue(true);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    await tool.handler({ text: 'Test feedback' });

    expect(mockFeedback).toHaveBeenCalledWith('Test feedback', {
      anonymous: true,
      version: '0.0.0-test',
    });
  });

  it('calls feedback with anonymous: true when preference is true', async () => {
    mockGetPref.mockReturnValue(true);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Great tool!' });

    expect(mockFeedback).toHaveBeenCalledWith('Great tool!', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
    expect(JSON.parse(result.content[0].text).ok).toBe(true);
  });

  it('calls feedback with anonymous: false when preference is false', async () => {
    mockGetPref.mockReturnValue(false);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Needs improvement' });

    expect(mockFeedback).toHaveBeenCalledWith('Needs improvement', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns consent prompt when preference is undefined and no anonymous param', async () => {
    mockGetPref.mockReturnValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Some feedback' });

    expect(mockFeedback).not.toHaveBeenCalled();
    expect(result.structuredContent.needsConsent).toBe(true);
    expect(result.structuredContent._hints.next).toEqual([
      'Ask the user if they want to include their info',
      'Call feedback again with anonymous: true or false',
    ]);
  });

  it('calls feedback and stores preference when preference is undefined but anonymous param is provided', async () => {
    mockGetPref.mockReturnValue(undefined);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({
      text: 'Feedback with consent',
      anonymous: true,
    });

    expect(mockSetPref).toHaveBeenCalledWith(true);
    expect(mockFeedback).toHaveBeenCalledWith('Feedback with consent', {
      anonymous: true,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns error on feedback failure', async () => {
    mockGetPref.mockReturnValue(true);
    mockFeedback.mockRejectedValue(new Error('Network error'));

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Will fail' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Network error');
  });

  it('stores preference via CLI when no prior preference and anonymous param provided', async () => {
    mockGetPref.mockReturnValue(undefined);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({
      text: 'No config feedback',
      anonymous: false,
    });

    expect(mockSetPref).toHaveBeenCalledWith(false);
    expect(mockFeedback).toHaveBeenCalledWith('No config feedback', {
      anonymous: false,
      version: '0.0.0-test',
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns consent prompt when preference undefined and no anonymous param', async () => {
    mockGetPref.mockReturnValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Some feedback' });

    expect(mockFeedback).not.toHaveBeenCalled();
    expect(result.structuredContent.needsConsent).toBe(true);
  });

  it('uses explicit anonymous override even when preference is stored', async () => {
    mockGetPref.mockReturnValue(true);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    await tool.handler({ text: 'Override test', anonymous: false });

    expect(mockFeedback).toHaveBeenCalledWith('Override test', {
      anonymous: false,
      version: '0.0.0-test',
    });
  });
});
