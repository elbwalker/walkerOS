import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Stub the broad `@walkeros/cli` surface (it transitively imports chalk/pacote/etc
// which Jest can't resolve) and forward `telemetry.*` to the real module. This
// matches the approach used by the rest of the MCP test suite.
jest.mock('@walkeros/cli', () => {
  const realTelemetry = jest.requireActual('../../../../cli/src/telemetry');
  return {
    telemetry: realTelemetry,
  };
});

import { writeConfig } from '../../../../cli/src/lib/config-file.js';
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

  it('maps clientInfo.name to source.type and emits mcp start in debug', async () => {
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
    expect(out).toContain('"type":"claude-ai","id":"mcp"');
    expect(out).toContain('"client":"claude-ai"');

    errSpy.mockRestore();
  });

  it('falls back to "unknown" source.type when clientInfo is missing', async () => {
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
    expect(out).toContain('"type":"unknown"');
    expect(out).toContain('"client":"unknown"');

    errSpy.mockRestore();
  });

  it('emitInvoke sends cmd invoke with tool name and timing', async () => {
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
    expect(out).toContain('"timing":42');

    errSpy.mockRestore();
  });
});
