import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { maybePrintFirstRunNotice } from '../first-run-notice.js';
import { writeConfig } from '../../lib/config-file.js';

const testDir = join(tmpdir(), `first-run-notice-test-${Date.now()}`);

describe('maybePrintFirstRunNotice', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Redirect XDG_CONFIG_HOME so getConfigDir() points to our temp dir.
    // Matches the isolation pattern in install-id.test.ts.
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('prints when no config exists and does not block', () => {
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    maybePrintFirstRunNotice();
    expect(errSpy).toHaveBeenCalled();
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toMatch(/anonymous usage/i);
    expect(out).toMatch(/DO_NOT_TRACK|WALKEROS_TELEMETRY_DISABLED/);
    errSpy.mockRestore();
  });

  it('does not print a second time if config already exists', () => {
    writeConfig({ installationId: 'x' });
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    maybePrintFirstRunNotice();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
