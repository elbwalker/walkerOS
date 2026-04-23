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

import { registerAuthTool } from '../../tools/auth.js';
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

describe('auth tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
  });

  it('registers with name "auth" and correct annotations', () => {
    registerAuthTool(server as never, stubClient());
    const tool = server.getTool('auth');
    expect(tool).toBeDefined();
    const config = tool!.config as { annotations: Record<string, boolean> };
    expect(config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  describe('status', () => {
    it('returns user info when authenticated', async () => {
      const whoami = jest.fn().mockResolvedValue({
        email: 'user@example.com',
        userId: 'usr_1',
      });
      const client = stubClient({
        resolveToken: () => ({ token: 'tok_123', source: 'config' }),
        whoami,
      });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'status' })) as {
        structuredContent: { authenticated: boolean; email?: string };
      };

      expect(whoami).toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(true);
      expect(result.structuredContent.email).toBe('user@example.com');
    });

    it('returns not authenticated when no token', async () => {
      const whoami = jest.fn();
      const client = stubClient({
        resolveToken: () => null,
        whoami,
      });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'status' })) as {
        structuredContent: {
          authenticated: boolean;
          _hints: { next: string[] };
        };
      };

      expect(whoami).not.toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent._hints.next).toEqual(
        expect.arrayContaining([expect.stringContaining('login')]),
      );
    });
  });

  describe('login', () => {
    it('returns URL and deviceCode immediately on fresh login without polling', async () => {
      const requestDeviceCode = jest.fn().mockResolvedValue({
        deviceCode: 'dev_abc',
        userCode: 'ABCD-1234',
        verificationUri: 'https://app.walkeros.io/device',
        verificationUriComplete:
          'https://app.walkeros.io/device?code=ABCD-1234',
        expiresIn: 900,
        interval: 5,
      });
      const pollForToken = jest.fn();
      const client = stubClient({ requestDeviceCode, pollForToken });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'login' })) as {
        structuredContent: {
          authenticated: boolean;
          status: string;
          loginUrl: string;
          deviceCode: string;
        };
      };

      expect(requestDeviceCode).toHaveBeenCalled();
      expect(pollForToken).not.toHaveBeenCalled();
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent.status).toBe('awaiting_authorization');
      expect(result.structuredContent.loginUrl).toContain('walkeros.io');
      expect(result.structuredContent.deviceCode).toBe('dev_abc');
    });

    it('only calls pollForToken when deviceCode is provided (retry)', async () => {
      const requestDeviceCode = jest.fn();
      const pollForToken = jest.fn().mockResolvedValue({
        success: true,
        status: 'authenticated',
        email: 'user@example.com',
        configPath: '/home/.config/walkeros/config.json',
      });
      const client = stubClient({ requestDeviceCode, pollForToken });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({
        action: 'login',
        deviceCode: 'dev_existing',
      })) as { structuredContent: { authenticated: boolean } };

      expect(requestDeviceCode).not.toHaveBeenCalled();
      expect(pollForToken).toHaveBeenCalledWith('dev_existing', {
        timeoutMs: 60000,
      });
      expect(result.structuredContent.authenticated).toBe(true);
    });

    it('returns pending with deviceCode on retry timeout', async () => {
      const requestDeviceCode = jest.fn();
      const pollForToken = jest.fn().mockResolvedValue({
        success: false,
        status: 'pending',
      });
      const client = stubClient({ requestDeviceCode, pollForToken });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({
        action: 'login',
        deviceCode: 'dev_timeout',
      })) as {
        structuredContent: {
          authenticated: boolean;
          status: string;
          deviceCode: string;
        };
      };

      expect(requestDeviceCode).not.toHaveBeenCalled();
      expect(pollForToken).toHaveBeenCalledWith('dev_timeout', {
        timeoutMs: 60000,
      });
      expect(result.structuredContent.authenticated).toBe(false);
      expect(result.structuredContent.status).toBe('pending');
      expect(result.structuredContent.deviceCode).toBe('dev_timeout');
    });

    it('returns error when poll fails with error status', async () => {
      const pollForToken = jest.fn().mockResolvedValue({
        success: false,
        status: 'error',
        error: 'access_denied',
      });
      const client = stubClient({ pollForToken });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({
        action: 'login',
        deviceCode: 'dev_denied',
      })) as { isError: boolean; content: Array<{ text: string }> };

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
      const deleteConfig = jest.fn().mockReturnValue(true);
      const client = stubClient({ deleteConfig });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'logout' })) as {
        structuredContent: { loggedOut: boolean; message: string };
      };

      expect(deleteConfig).toHaveBeenCalled();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('Logged out');
    });

    it('returns success even when no config existed', async () => {
      delete process.env.WALKEROS_TOKEN;
      const deleteConfig = jest.fn().mockReturnValue(false);
      const client = stubClient({ deleteConfig });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'logout' })) as {
        structuredContent: { loggedOut: boolean; message: string };
      };

      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('already logged out');
    });

    it('clears WALKEROS_TOKEN env var and mentions it in the message', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_abc';
      const deleteConfig = jest.fn().mockReturnValue(true);
      const client = stubClient({ deleteConfig });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'logout' })) as {
        structuredContent: { loggedOut: boolean; message: string };
      };

      expect(deleteConfig).toHaveBeenCalled();
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('Config removed');
      expect(result.structuredContent.message).toContain('WALKEROS_TOKEN');
    });

    it('subsequent status call reports unauthenticated after logout with env token', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_xyz';
      const deleteConfig = jest.fn().mockReturnValue(true);
      const client = stubClient({
        deleteConfig,
        resolveToken: () => null,
      });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      await tool.handler({ action: 'logout' });
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();

      const statusResult = (await tool.handler({ action: 'status' })) as {
        structuredContent: { authenticated: boolean };
      };
      expect(statusResult.structuredContent.authenticated).toBe(false);
    });

    it('clears env token even when no config existed', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_only';
      const deleteConfig = jest.fn().mockReturnValue(false);
      const client = stubClient({ deleteConfig });
      registerAuthTool(server as never, client);

      const tool = server.getTool('auth')!;
      const result = (await tool.handler({ action: 'logout' })) as {
        structuredContent: { loggedOut: boolean; message: string };
      };

      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(result.structuredContent.loggedOut).toBe(true);
      expect(result.structuredContent.message).toContain('WALKEROS_TOKEN');
    });
  });
});
