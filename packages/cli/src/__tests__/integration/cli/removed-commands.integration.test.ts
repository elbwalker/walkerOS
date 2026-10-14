/**
 * A removed remote command fails as an unknown command with a non-zero exit,
 * and the help lists none of them. Runs the built binary; the integration
 * task builds the package first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(__dirname, '..', '..', '..', '..', 'dist', 'cli.js');
const REMOVED = [
  'projects',
  'flows',
  'deploy',
  'deployments',
  'previews',
  'secrets',
  'observe',
  'journeys',
  'hub',
  'frames',
  'feedback',
];

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'walkeros-removed-')),
    },
    timeout: 30000,
  });
}

describe('removed remote commands', () => {
  it('fail as unknown commands and are not listed in the help', () => {
    expect(existsSync(CLI)).toBe(true);
    const deploy = run(['deploy', 'list']);
    expect(deploy.status).not.toBe(0);
    expect(deploy.stderr).toMatch(/unknown command 'deploy'/);
    const help = run(['--help']);
    expect(help.status).toBe(0);
    const listed = help.stdout
      .split('\n')
      .map((text) => text.trim().split(/\s+/)[0]);
    expect(REMOVED.filter((name) => listed.includes(name))).toEqual([]);
  });
});
