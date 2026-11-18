import '../../helpers/setup-msw.js';
import { server } from '../../helpers/msw-server.js';
import { Writable } from 'stream';
import { runAuthToken } from '../../../commands/auth/index.js';
import {
  serviceAuthServer,
  testCredential,
} from '../../helpers/service-credential.js';

function sink() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk.toString('utf-8'));
      done();
    },
  });
  return { stream, text: () => chunks.join('') };
}

describe('walkeros auth token', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.WALKEROS_CREDENTIAL;
  });

  afterEach(() => {
    process.env = env;
  });

  it.each<
    [
      string,
      'automation' | 'deployment' | undefined,
      { exit: number; stdout: string; stderr: RegExp | string },
    ]
  >([
    [
      'prints only the unbound bearer of an automation',
      'automation',
      { exit: 0, stdout: 'bearer-1\n', stderr: '' },
    ],
    [
      'exits 1 with the fact when no credential is set',
      undefined,
      {
        exit: 1,
        stdout: '',
        stderr: 'walkeros auth token: WALKEROS_CREDENTIAL is not set\n',
      },
    ],
    [
      "prints the auth server's answer for a runner's credential and exits 1",
      'deployment',
      {
        exit: 1,
        stdout: '',
        stderr:
          /^walkeros auth token: .*This credential buys bound tokens only.*\n$/,
      },
    ],
  ])('%s', async (_name, kind, expected) => {
    const auth = serviceAuthServer(kind);
    server.use(...auth.handlers);
    if (kind) process.env.WALKEROS_CREDENTIAL = await testCredential(kind);
    const stdout = sink();
    const stderr = sink();

    const exit = await runAuthToken({
      stdout: stdout.stream,
      stderr: stderr.stream,
    });

    expect(exit).toBe(expected.exit);
    expect(stdout.text()).toBe(expected.stdout);
    if (typeof expected.stderr === 'string')
      expect(stderr.text()).toBe(expected.stderr);
    else expect(stderr.text()).toMatch(expected.stderr);
    // The unbound request carries no proof; nothing asks for a bound token.
    expect(auth.tokenRequests.every((request) => request.dpop === null)).toBe(
      true,
    );
  });
});
