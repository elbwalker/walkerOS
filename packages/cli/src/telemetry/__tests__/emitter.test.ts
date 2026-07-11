import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import { createEmitter } from '../emitter.js';
import { writeConfig, getConfigPath } from '../../lib/config-file.js';

// Intercept the transport the API destination hands the serialized event to,
// so a "real push" assertion can read the source the collector stamped without
// opening a socket. The destination reads `sendServer` from
// `@walkeros/server-core`; the arrow defers the `mockSendServer` reference to
// call time so the const is initialized before the factory result is invoked.
const mockSendServer = jest.fn(
  (
    _url: string,
    _data?: SendDataValue,
    _options?: SendServerOptions,
  ): Promise<SendResponse> => Promise.resolve({ ok: true }),
);

jest.mock('@walkeros/server-core', () => {
  const actual = jest.requireActual<typeof import('@walkeros/server-core')>(
    '@walkeros/server-core',
  );
  return {
    ...actual,
    sendServer: (
      url: string,
      data?: SendDataValue,
      options?: SendServerOptions,
    ): Promise<SendResponse> => mockSendServer(url, data, options),
  };
});

const testDir = join(tmpdir(), `emitter-test-${Date.now()}`);

describe('emitter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Redirect XDG_CONFIG_HOME so getConfigDir() points to our temp dir.
    // Matches the isolation pattern in install-id.test.ts.
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    delete process.env.DO_NOT_TRACK;
    delete process.env.WALKEROS_TELEMETRY_DISABLED;
    delete process.env.WALKEROS_TELEMETRY_DEBUG;
    delete process.env.WALKEROS_APP_URL;
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    // Ensure the config file does not exist between tests.
    const p = getConfigPath();
    if (existsSync(p)) rmSync(p, { force: true });
    mockSendServer.mockClear();
    mockSendServer.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns a no-op sender when opted out (no config written, no startFlow)', async () => {
    process.env.DO_NOT_TRACK = '1';
    const emitter = await createEmitter({
      source: { type: 'cli', platform: 'terminal' },
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', {
      command: 'bundle',
      outcome: 'success',
    });
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('prints event shape to stderr in debug mode and skips network', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const emitter = await createEmitter({
      source: { type: 'cli', platform: 'terminal' },
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', { command: 'x', outcome: 'success' }, 42);
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"cmd invoke"');
    expect(out).toContain('"timing":42');
    expect(out).toContain('"source":{"type":"cli","platform":"terminal"');
    // The emitter is its own flow: its version rides source.release under its
    // own surface key (cli), not source.version.
    expect(out).toContain('"release":{"cli":"3.4.2"}');
    expect(out).not.toContain('"version":');
    expect(out).toContain('"consent":{"telemetry":true}');
    errSpy.mockRestore();
  });

  it('swallows transport errors and never throws', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    process.env.WALKEROS_APP_URL = 'http://telemetry.test';
    mockSendServer.mockRejectedValueOnce(new Error('network down'));
    const emitter = await createEmitter({
      source: { type: 'cli', platform: 'terminal' },
      packageVersion: '3.4.2',
    });
    await expect(
      emitter.send('cmd invoke', { command: 'x', outcome: 'success' }),
    ).resolves.toBeUndefined();
  });

  it('sends source.release keyed by source type, without source.version', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    process.env.WALKEROS_APP_URL = 'http://telemetry.test';
    const emitter = await createEmitter({
      source: { type: 'cli', platform: 'terminal' },
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', { command: 'x', outcome: 'success' });

    expect(mockSendServer).toHaveBeenCalledTimes(1);
    const body = mockSendServer.mock.calls[0]?.[1];
    if (typeof body !== 'string')
      throw new Error('expected a serialized event body');
    const parsed: unknown = JSON.parse(body);
    expect(parsed).toMatchObject({
      source: { type: 'cli', platform: 'terminal', release: { cli: '3.4.2' } },
    });
    expect(parsed).not.toHaveProperty('source.version');
  });

  it('passes user.session to the collector when provided (MCP case)', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const emitter = await createEmitter({
      source: { type: 'mcp', platform: 'server' },
      packageVersion: '3.4.2',
      session: 'sess-xyz',
    });
    await emitter.send('mcp start', { ci: false, client: 'claude-ai' });
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"session":"sess-xyz"');
    errSpy.mockRestore();
  });

  it('still prints to stderr in debug mode even with no endpoint', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const emitter = await createEmitter({
      source: { type: 'cli', platform: 'terminal' },
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', { command: 'x', outcome: 'success' }, 10);
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"cmd invoke"');
    errSpy.mockRestore();
  });
});
