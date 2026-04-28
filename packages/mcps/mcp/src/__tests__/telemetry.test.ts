import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Stub the broad `@walkeros/cli` surface (it transitively imports chalk/pacote/etc
// which Jest can't resolve) and forward `telemetry.*` plus `writeConfig` to
// their real implementations. This matches the approach used by the rest of the
// MCP test suite. Relative `requireActual` paths bypass jest's moduleNameMapper
// so we don't re-enter the mocked module.
jest.mock('@walkeros/cli', () => {
  const realTelemetry = jest.requireActual('../../../../cli/src/telemetry');
  const realConfig = jest.requireActual('../../../../cli/src/lib/config-file');
  return {
    telemetry: realTelemetry,
    writeConfig: realConfig.writeConfig,
  };
});

import { writeConfig } from '@walkeros/cli';
import { createMcpEmitter } from '../telemetry.js';

const testDir = join(tmpdir(), `mcp-telemetry-test-${Date.now()}`);

describe('MCP emitter wrapper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Isolate config/state via XDG_CONFIG_HOME, matching CLI telemetry tests.
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    delete process.env.DO_NOT_TRACK;
    delete process.env.WALKEROS_TELEMETRY_DISABLED;
    delete process.env.WALKEROS_TELEMETRY_DEBUG;
    delete process.env.TELEMETRY_ENDPOINT;
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    // Seed opt-in config so emitter is enabled under the new opt-in default.
    writeConfig({ installationId: 'install-x', telemetryEnabled: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('emits mcp start with source.type=mcp, platform=server, no version block', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const emitter = await createMcpEmitter({
      clientInfo: { name: 'claude-ai', version: '1.0.0' },
      packageVersion: '3.4.2',
    });
    await emitter.emitStart();

    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"mcp start"');
    expect(out).toContain('"source":{"type":"mcp","platform":"server"');
    expect(out).toContain('"version":"3.4.2"');
    expect(out).not.toContain('"version":{');
    expect(out).toContain('"client":"claude-ai"');

    errSpy.mockRestore();
  });

  it('records client="unknown" in event data when clientInfo is missing', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const emitter = await createMcpEmitter({
      clientInfo: undefined,
      packageVersion: '3.4.2',
    });
    await emitter.emitStart();

    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"source":{"type":"mcp","platform":"server"');
    expect(out).toContain('"client":"unknown"');

    errSpy.mockRestore();
  });

  it('emitInvoke sets per-emission source.tool and includes outcome+client in data', async () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    const emitter = await createMcpEmitter({
      clientInfo: { name: 'claude-code', version: '2.0' },
      packageVersion: '3.4.2',
    });
    await emitter.emitInvoke('flow_simulate', 'success', 42);

    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('"name":"cmd invoke"');
    expect(out).toContain('"tool":"flow_simulate"');
    expect(out).toContain('"outcome":"success"');
    expect(out).toContain('"client":"claude-code"');
    expect(out).toContain('"timing":42');

    errSpy.mockRestore();
  });
});
