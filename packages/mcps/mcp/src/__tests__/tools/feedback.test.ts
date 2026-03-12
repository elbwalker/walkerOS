import { registerFeedbackTool } from '../../tools/feedback.js';

jest.mock('@walkeros/cli', () => ({
  feedback: jest.fn(),
  readConfig: jest.fn(),
  writeConfig: jest.fn(),
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

import { feedback, readConfig, writeConfig } from '@walkeros/cli';
const mockFeedback = jest.mocked(feedback);
const mockReadConfig = jest.mocked(readConfig);
const mockWriteConfig = jest.mocked(writeConfig);

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

  it('calls feedback with anonymous: true when config has anonymousFeedback: true', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
      anonymousFeedback: true,
    });
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Great tool!' });

    expect(mockFeedback).toHaveBeenCalledWith('Great tool!', {
      anonymous: true,
    });
    expect(result.structuredContent).toEqual({ ok: true });
    expect(result.content[0].text).toBe('Feedback sent. Thanks!');
  });

  it('calls feedback with anonymous: false when config has anonymousFeedback: false', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
      anonymousFeedback: false,
    });
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Needs improvement' });

    expect(mockFeedback).toHaveBeenCalledWith('Needs improvement', {
      anonymous: false,
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns consent prompt when config anonymousFeedback is undefined and no anonymous param', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
    });

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Some feedback' });

    expect(mockFeedback).not.toHaveBeenCalled();
    expect(result.structuredContent).toEqual({ needsConsent: true });
  });

  it('calls feedback and stores preference when config is undefined but anonymous param is provided', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
    });
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({
      text: 'Feedback with consent',
      anonymous: true,
    });

    expect(mockWriteConfig).toHaveBeenCalledWith({
      token: 't',
      email: 'e',
      appUrl: 'u',
      anonymousFeedback: true,
    });
    expect(mockFeedback).toHaveBeenCalledWith('Feedback with consent', {
      anonymous: true,
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns error on feedback failure', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
      anonymousFeedback: true,
    });
    mockFeedback.mockRejectedValue(new Error('Network error'));

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Will fail' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Network error');
  });

  it('creates fresh config when config is null and anonymous param provided', async () => {
    mockReadConfig.mockReturnValue(null);
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    const result = await tool.handler({
      text: 'No config feedback',
      anonymous: false,
    });

    expect(mockWriteConfig).toHaveBeenCalledWith({
      token: '',
      email: '',
      appUrl: '',
      anonymousFeedback: false,
    });
    expect(mockFeedback).toHaveBeenCalledWith('No config feedback', {
      anonymous: false,
    });
    expect(result.structuredContent).toEqual({ ok: true });
  });

  it('returns consent prompt when config is null and no anonymous param', async () => {
    mockReadConfig.mockReturnValue(null);

    const tool = server.getTool('feedback');
    const result = await tool.handler({ text: 'Some feedback' });

    expect(mockFeedback).not.toHaveBeenCalled();
    expect(result.structuredContent).toEqual({ needsConsent: true });
  });

  it('uses explicit anonymous override even when config has stored preference', async () => {
    mockReadConfig.mockReturnValue({
      token: 't',
      email: 'e',
      appUrl: 'u',
      anonymousFeedback: true,
    });
    mockFeedback.mockResolvedValue(undefined);

    const tool = server.getTool('feedback');
    await tool.handler({ text: 'Override test', anonymous: false });

    expect(mockFeedback).toHaveBeenCalledWith('Override test', {
      anonymous: false,
    });
  });
});
