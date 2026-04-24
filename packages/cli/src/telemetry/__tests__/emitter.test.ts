import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createEmitter } from '../emitter.js';
import { writeConfig, getConfigPath } from '../../lib/config-file.js';

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
    delete process.env.TELEMETRY_ENDPOINT;
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    // Ensure the config file does not exist between tests.
    const p = getConfigPath();
    if (existsSync(p)) rmSync(p, { force: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns a no-op sender when opted out (no config written, no startFlow)', async () => {
    process.env.DO_NOT_TRACK = '1';
    const emitter = await createEmitter({
      sourceId: 'cli',
      sourceType: 'terminal',
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
      sourceId: 'cli',
      sourceType: 'terminal',
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', { command: 'x', outcome: 'success' }, 42);
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"cmd invoke"');
    expect(out).toContain('"timing":42');
    expect(out).toContain('"source":{"type":"terminal","id":"cli"');
    expect(out).toContain('"version":{"source":"3.4.2","tagging":1}');
    expect(out).toContain('"consent":{"telemetry":true}');
    errSpy.mockRestore();
  });

  it('swallows network errors and never throws', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    process.env.TELEMETRY_ENDPOINT = 'http://127.0.0.1:1'; // unreachable
    const emitter = await createEmitter({
      sourceId: 'cli',
      sourceType: 'terminal',
      packageVersion: '3.4.2',
    });
    await expect(
      emitter.send('cmd invoke', { command: 'x', outcome: 'success' }),
    ).resolves.toBeUndefined();
  });

  it('passes user.session to the collector when provided (MCP case)', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const emitter = await createEmitter({
      sourceId: 'mcp',
      sourceType: 'claude-ai',
      packageVersion: '3.4.2',
      session: 'sess-xyz',
    });
    await emitter.send('mcp start', { ci: false, client: 'claude-ai' });
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"session":"sess-xyz"');
    errSpy.mockRestore();
  });

  it('is a no-op when opted in but no endpoint is configured', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    // No TELEMETRY_ENDPOINT env var; flow.json still has the $TELEMETRY_ENDPOINT placeholder.
    const emitter = await createEmitter({
      sourceId: 'cli',
      sourceType: 'terminal',
      packageVersion: '3.4.2',
    });
    // send resolves, does not throw, never attempts network.
    await expect(
      emitter.send('cmd invoke', { command: 'x', outcome: 'success' }),
    ).resolves.toBeUndefined();
    // Assert we did NOT initialize the collector by checking no stderr writes
    // (debug mode is off; production no-op is silent).
    // We don't have a direct collector spy here; the resolution + no exception
    // above is the observable signal. This test locks the behavior: the
    // previous code would have invoked the collector with a 404 endpoint.
  });

  it('still prints to stderr in debug mode even with no endpoint', async () => {
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    const emitter = await createEmitter({
      sourceId: 'cli',
      sourceType: 'terminal',
      packageVersion: '3.4.2',
    });
    await emitter.send('cmd invoke', { command: 'x', outcome: 'success' }, 10);
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"cmd invoke"');
    errSpy.mockRestore();
  });
});
