import { registerAuthTool } from '../../tools/auth.js';

jest.mock('@walkeros/cli', () => ({
  resolveToken: jest.fn(),
  whoami: jest.fn(),
  requestDeviceCode: jest.fn(),
  pollForToken: jest.fn(),
  deleteConfig: jest.fn(),
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
  resolveToken,
  whoami,
  requestDeviceCode,
  pollForToken,
  deleteConfig,
} from '@walkeros/cli';

const mockResolveToken = jest.mocked(resolveToken);
const mockWhoami = jest.mocked(whoami);
const mockRequestDeviceCode = jest.mocked(requestDeviceCode);
const mockPollForToken = jest.mocked(pollForToken);
const mockDeleteConfig = jest.mocked(deleteConfig);

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

describe('auth tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerAuthTool(server as any);
  });

  it('registers with name "auth" and correct annotations', () => {
    const tool = server.getTool('auth');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('status', () => {
    it('returns user info when authenticated', async () => {
      mockResolveToken.mockReturnValue({ token: 'tok_123', source: 'config' });
      mockWhoami.mockResolvedValue({
        email: 'user@example.com',
        userId: 'usr_1',
      });

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'status' });

      expect(mockResolveToken).toHaveBeenCalled();
      expect(mockWhoami).toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(true);
      expect(result.structuredContent.email).toBe('user@example.com');
    });

    it('returns not authenticated when no token', async () => {
      mockResolveToken.mockReturnValue(null);

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'status' });

      expect(mockResolveToken).toHaveBeenCalled();
      expect(mockWhoami).not.toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('login')]),
      );
    });
  });

  describe('login', () => {
    it('returns URL and deviceCode immediately on fresh login without polling', async () => {
      mockRequestDeviceCode.mockResolvedValue({
        deviceCode: 'dev_abc',
        userCode: 'ABCD-1234',
        verificationUri: 'https://app.walkeros.io/device',
        verificationUriComplete:
          'https://app.walkeros.io/device?code=ABCD-1234',
        expiresIn: 900,
        interval: 5,
      });

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'login' });

      expect(mockRequestDeviceCode).toHaveBeenCalled();
      expect(mockPollForToken).not.toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent.status).toBe('awaiting_authorization');
      expect(result.structuredContent.loginUrl).toContain('walkeros.io');
      expect(result.structuredContent.deviceCode).toBe('dev_abc');
    });

    it('only calls pollForToken when deviceCode is provided (retry)', async () => {
      mockPollForToken.mockResolvedValue({
        success: true,
        status: 'authenticated',
        email: 'user@example.com',
        configPath: '/home/.config/walkeros/config.json',
      });

      const tool = server.getTool('auth');
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_existing',
      });

      expect(mockRequestDeviceCode).not.toHaveBeenCalled();
      expect(mockPollForToken).toHaveBeenCalledWith('dev_existing', {
        timeoutMs: 60000,
      });
      expect(result.structuredContent.authenticated).toBe(true);
    });

    it('returns pending with deviceCode on retry timeout', async () => {
      mockPollForToken.mockResolvedValue({
        success: false,
        status: 'pending',
      });

      const tool = server.getTool('auth');
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_timeout',
      });

      expect(mockRequestDeviceCode).not.toHaveBeenCalled();
      expect(mockPollForToken).toHaveBeenCalledWith('dev_timeout', {
        timeoutMs: 60000,
      });
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent.status).toBe('pending');
      expect(result.structuredContent.deviceCode).toBe('dev_timeout');
    });

    it('returns error when poll fails with error status', async () => {
      mockPollForToken.mockResolvedValue({
        success: false,
        status: 'error',
        error: 'access_denied',
      });

      const tool = server.getTool('auth');
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_denied',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('access_denied');
    });
  });

  describe('logout', () => {
    const origEnvToken = process.env.WALKEROS_TOKEN;

    afterEach(() => {
      if (origEnvToken !== undefined) {
        process.env.WALKEROS_TOKEN = origEnvToken;
      } else {
        delete process.env.WALKEROS_TOKEN;
      }
    });

    it('calls deleteConfig and returns success', async () => {
      delete process.env.WALKEROS_TOKEN;
      mockDeleteConfig.mockReturnValue(true);

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'logout' });

      expect(mockDeleteConfig).toHaveBeenCalled();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('Logged out');
    });

    it('returns success even when no config existed', async () => {
      delete process.env.WALKEROS_TOKEN;
      mockDeleteConfig.mockReturnValue(false);

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'logout' });

      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('already logged out');
    });

    it('clears WALKEROS_TOKEN env var and mentions it in the message', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_abc';
      mockDeleteConfig.mockReturnValue(true);

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'logout' });

      expect(mockDeleteConfig).toHaveBeenCalled();
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('Config removed');
      expect(result.structuredContent.message).toContain('WALKEROS_TOKEN');
    });

    it('subsequent status call reports unauthenticated after logout with env token', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_xyz';
      mockDeleteConfig.mockReturnValue(true);
      // Tool's own status path calls resolveToken(); simulate it returning null
      // once logout clears things.
      mockResolveToken.mockReturnValue(null);

      const tool = server.getTool('auth');
      await tool.handler({ action: 'logout' });
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();

      const statusResult = await tool.handler({ action: 'status' });
      expect(statusResult.structuredContent.authenticated).toBe(false);
    });

    it('clears env token even when no config existed', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_only';
      mockDeleteConfig.mockReturnValue(false);

      const tool = server.getTool('auth');
      const result = await tool.handler({ action: 'logout' });

      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('WALKEROS_TOKEN');
    });
  });
});
