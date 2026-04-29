/**
 * CLI Telemetry Emission Test
 *
 * Verifies the CLI emits `cmd invoke` telemetry in debug mode. Spawns
 * `dist/cli.js` with `WALKEROS_TELEMETRY_DEBUG=1` and asserts the debug
 * payload is written to stderr with the expected source shape.
 *
 * Depends on a built `dist/cli.js`. Run `npm run build --workspace=packages/cli`
 * before executing this test. The test itself does not build.
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const projectRoot = resolve(__dirname, '..', '..', '..');
const CLI_BIN = join(projectRoot, 'dist', 'cli.js');

const describeIfBuilt = existsSync(CLI_BIN) ? describe : describe.skip;

describeIfBuilt('CLI emits telemetry via debug mode', () => {
  it('emits cmd invoke on a simple command', () => {
    // Telemetry is opt-in by default. Seed a config with telemetryEnabled: true
    // in the isolated XDG_CONFIG_HOME so the spawned CLI runs the debug path.
    const xdgConfigHome = '/tmp/walkeros-test-' + Date.now();
    const walkerosDir = join(xdgConfigHome, 'walkeros');
    mkdirSync(walkerosDir, { recursive: true });
    writeFileSync(
      join(walkerosDir, 'config.json'),
      JSON.stringify({
        installationId: '00000000-0000-0000-0000-000000000000',
        telemetryEnabled: true,
      }),
      { mode: 0o600 },
    );

    const result = spawnSync('node', [CLI_BIN, '--version'], {
      env: {
        ...process.env,
        WALKEROS_TELEMETRY_DEBUG: '1',
        XDG_CONFIG_HOME: xdgConfigHome,
      },
      encoding: 'utf-8',
    });

    expect(result.stderr).toContain('"name":"cmd invoke"');
    expect(result.stderr).toContain(
      '"source":{"type":"cli","platform":"terminal"',
    );
  });
});
