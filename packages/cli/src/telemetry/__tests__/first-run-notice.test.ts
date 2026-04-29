import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { maybePrintFirstRunNotice } from '../first-run-notice.js';
import { writeConfig, readConfig } from '../../lib/config-file.js';

const testDir = join(tmpdir(), `first-run-notice-test-${Date.now()}`);

describe('maybePrintFirstRunNotice (opt-in)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('prints an opt-in message when no config exists', () => {
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    maybePrintFirstRunNotice();
    const out = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toMatch(/anonymous/i);
    expect(out).toMatch(/walkeros telemetry enable/);
    expect(out).not.toMatch(/opt out/i);
    errSpy.mockRestore();
  });

  it('does not print a second time if a config exists', () => {
    writeConfig({ token: 'x' });
    const errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    maybePrintFirstRunNotice();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('does not write anything to disk', () => {
    maybePrintFirstRunNotice();
    expect(readConfig()).toBeNull();
  });
});
