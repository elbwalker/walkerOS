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

import { createAuthToolSpec } from '../../tools/auth.js';
import { stubClient } from '../support/stub-client.js';
import {
  structured,
  hintsOf,
  textOf,
  isErrorResult,
} from '../support/tool-result.js';

describe('auth tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with name "auth" and correct annotations', () => {
    const spec = createAuthToolSpec(stubClient());
    expect(spec.name).toBe('auth');
    expect(spec.annotations).toEqual({
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
        credentialSource: () => 'config',
        whoami,
      });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'status' });

      expect(whoami).toHaveBeenCalled();
      expect(structured(result).authenticated).toBe(true);
      expect(structured(result).email).toBe('user@example.com');
    });

    it('returns not authenticated when no credential is available', async () => {
      const whoami = jest.fn();
      const client = stubClient({
        credentialSource: () => null,
        whoami,
      });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'status' });

      expect(whoami).not.toHaveBeenCalled();
      expect(structured(result).authenticated).toBe(false);
      expect(hintsOf(result)).toEqual(
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
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'login' });

      expect(requestDeviceCode).toHaveBeenCalled();
      expect(pollForToken).not.toHaveBeenCalled();
      expect(structured(result).authenticated).toBe(false);
      expect(structured(result).status).toBe('awaiting_authorization');
      expect(structured(result).loginUrl).toContain('walkeros.io');
      expect(structured(result).deviceCode).toBe('dev_abc');
    });

    it('only calls pollForToken when deviceCode is provided (retry)', async () => {
      const requestDeviceCode = jest.fn();
      const pollForToken = jest.fn().mockResolvedValue({ status: 'ok' });
      const client = stubClient({ requestDeviceCode, pollForToken });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_existing',
      });

      expect(requestDeviceCode).not.toHaveBeenCalled();
      expect(pollForToken).toHaveBeenCalledWith('dev_existing', {
        timeoutMs: 60000,
      });
      expect(structured(result).authenticated).toBe(true);
    });

    it('returns pending with deviceCode on retry timeout', async () => {
      const requestDeviceCode = jest.fn();
      const pollForToken = jest.fn().mockResolvedValue({ status: 'pending' });
      const client = stubClient({ requestDeviceCode, pollForToken });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_timeout',
      });

      expect(requestDeviceCode).not.toHaveBeenCalled();
      expect(pollForToken).toHaveBeenCalledWith('dev_timeout', {
        timeoutMs: 60000,
      });
      expect(structured(result).authenticated).toBe(false);
      expect(structured(result).status).toBe('pending');
      expect(structured(result).deviceCode).toBe('dev_timeout');
      expect(structured(result).message).toContain('shortly');
    });

    it('asks for a longer wait on slow_down, still returning the device code', async () => {
      // The control for the pending case above: both are "keep waiting", so
      // the differing advice must come from the status and not from the branch
      // that renders it.
      const pollForToken = jest.fn().mockResolvedValue({ status: 'slow_down' });
      const client = stubClient({ pollForToken });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_slow',
      });

      expect(structured(result).authenticated).toBe(false);
      expect(structured(result).status).toBe('pending');
      expect(structured(result).deviceCode).toBe('dev_slow');
      expect(structured(result).message).toContain('longer');
    });

    it.each([
      ['denied', 'denied'],
      ['expired', 'expired'],
    ])('reports %s as a distinct error', async (status, expected) => {
      const pollForToken = jest.fn().mockResolvedValue({ status });
      const client = stubClient({ pollForToken });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_terminal',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed: unknown = JSON.parse(textOf(result));
      expect(parsed).toHaveProperty('error', expect.stringContaining(expected));
    });

    it('returns error when poll fails with error status', async () => {
      const pollForToken = jest.fn().mockResolvedValue({
        status: 'error',
        error: 'invalid_client',
      });
      const client = stubClient({ pollForToken });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({
        action: 'login',
        deviceCode: 'dev_broken',
      });

      expect(isErrorResult(result)).toBe(true);
      const parsed: unknown = JSON.parse(textOf(result));
      expect(parsed).toHaveProperty('error', 'invalid_client');
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

    it('revokes the session through logout and returns success', async () => {
      delete process.env.WALKEROS_TOKEN;
      const logout = jest.fn().mockResolvedValue({ deleted: true });
      const client = stubClient({ logout });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'logout' });

      expect(logout).toHaveBeenCalled();
      expect(structured(result).loggedOut).toBe(true);
      expect(structured(result).message).toContain('Logged out');
    });

    it('returns success even when no config existed', async () => {
      delete process.env.WALKEROS_TOKEN;
      const logout = jest.fn().mockResolvedValue({ deleted: false });
      const client = stubClient({ logout });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'logout' });

      expect(structured(result).loggedOut).toBe(true);
      expect(structured(result).message).toContain('already logged out');
    });

    it('clears WALKEROS_TOKEN env var and mentions it in the message', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_abc';
      const logout = jest.fn().mockResolvedValue({ deleted: true });
      const client = stubClient({ logout });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'logout' });

      expect(logout).toHaveBeenCalled();
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(structured(result).loggedOut).toBe(true);
      expect(structured(result).message).toContain('Config removed');
      expect(structured(result).message).toContain('WALKEROS_TOKEN');
    });

    it('subsequent status call reports unauthenticated after logout with env token', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_xyz';
      const logout = jest.fn().mockResolvedValue({ deleted: true });
      const client = stubClient({
        logout,
        credentialSource: () => null,
      });
      const tool = createAuthToolSpec(client);
      await tool.handler({ action: 'logout' });
      expect(process.env.WALKEROS_TOKEN).toBeUndefined();

      const statusResult = await tool.handler({ action: 'status' });
      expect(structured(statusResult).authenticated).toBe(false);
    });

    it('clears env token even when no config existed', async () => {
      process.env.WALKEROS_TOKEN = 'tok_env_only';
      const logout = jest.fn().mockResolvedValue({ deleted: false });
      const client = stubClient({ logout });
      const tool = createAuthToolSpec(client);
      const result = await tool.handler({ action: 'logout' });

      expect(process.env.WALKEROS_TOKEN).toBeUndefined();
      expect(structured(result).loggedOut).toBe(true);
      expect(structured(result).message).toContain('WALKEROS_TOKEN');
    });
  });
});
