import { spawn } from 'child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  browserCommand,
  openSignInPage,
  type OpenerCommand,
  type Spawner,
} from '../../../core/browser-opener.js';

const ISSUER = 'https://app.walkeros.io';
const URL_WITH_AMPERSANDS = `${ISSUER}/oauth/authorize?response_type=code&client_id=x&state=y`;

describe('browserCommand', () => {
  const noBrowser: NodeJS.ProcessEnv = {};

  const openers: Array<[NodeJS.Platform, OpenerCommand]> = [
    [
      'win32',
      {
        command: 'rundll32.exe',
        args: ['url.dll,FileProtocolHandler', URL_WITH_AMPERSANDS],
      },
    ],
    ['darwin', { command: 'open', args: [URL_WITH_AMPERSANDS] }],
    ['linux', { command: 'xdg-open', args: [URL_WITH_AMPERSANDS] }],
  ];

  it.each(openers)(
    'on %s runs one program with the address as its own argument',
    (platform, expected) => {
      const opener = browserCommand(URL_WITH_AMPERSANDS, platform, noBrowser);
      expect(opener).toEqual(expected);
      expect([opener.command, ...opener.args].join(' ')).not.toMatch(
        /\bcmd\b|\bstart\b/,
      );
    },
  );

  it('runs BROWSER as one executable, not split on spaces', () => {
    expect(
      browserCommand(URL_WITH_AMPERSANDS, 'win32', {
        BROWSER: '/opt/my browser/open --new',
      }),
    ).toEqual({
      command: '/opt/my browser/open --new',
      args: [URL_WITH_AMPERSANDS],
    });
  });
});

describe('openSignInPage', () => {
  const env = process.env;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-opener-'));
  });
  afterEach(() => {
    process.env = env;
    rmSync(dir, { recursive: true, force: true });
  });

  it.each([
    ['plain http to another host', 'http://app.walkeros.io/oauth/authorize'],
    ['another origin', 'https://evil.example/a?x=1&calc'],
    ['a file address', 'file:///etc/passwd'],
    ['a custom scheme', 'vscode://open?x'],
    ['a control character', `${ISSUER}/oauth/authorize?x=1\n&calc`],
  ])('opens nothing for %s', async (_name, url) => {
    const run = jest.fn();
    const result = await openSignInPage(url, ISSUER, run);
    expect(result.kind).toBe('refused');
    expect(run).not.toHaveBeenCalled();
  });

  it('hands the address to BROWSER as its only argument, with no shell', async () => {
    const folder = join(dir, 'with space');
    mkdirSync(folder);
    const script = join(folder, 'browser');
    const seen = join(dir, 'seen.txt');
    writeFileSync(script, `#!/bin/sh\nprintf '%s\\n' "$#" "$1" > '${seen}'\n`);
    chmodSync(script, 0o755);
    process.env = { ...env, BROWSER: script };

    await expect(openSignInPage(URL_WITH_AMPERSANDS, ISSUER)).resolves.toEqual({
      kind: 'opened',
    });
    const written = () =>
      existsSync(seen) && readFileSync(seen, 'utf-8').split('\n').length === 3;
    for (let i = 0; i < 50 && !written(); i += 1)
      await new Promise((resolve) => setTimeout(resolve, 50));
    expect(readFileSync(seen, 'utf-8')).toBe(`1\n${URL_WITH_AMPERSANDS}\n`);
  });

  it('spawns detached, ignoring stdio, without a shell', async () => {
    process.env = { ...env, BROWSER: '/bin/true' };
    const calls: unknown[] = [];
    const run: Spawner = (command, args, options) => {
      calls.push([command, args, options]);
      return spawn('/bin/true');
    };
    await openSignInPage(URL_WITH_AMPERSANDS, ISSUER, run);
    expect(calls).toEqual([
      [
        '/bin/true',
        [URL_WITH_AMPERSANDS],
        { detached: true, stdio: 'ignore', shell: false, windowsHide: true },
      ],
    ]);
  });

  it('reports an opener that cannot start, so the login can name --no-browser', async () => {
    process.env = { ...env, BROWSER: join(dir, 'missing-browser') };
    await expect(openSignInPage(URL_WITH_AMPERSANDS, ISSUER)).resolves.toEqual({
      kind: 'failed',
      reason: expect.stringContaining('missing-browser'),
    });
  });
});
