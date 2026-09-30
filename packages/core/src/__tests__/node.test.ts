import os from 'os';
import { Level } from '../types/logger';
import { createCLILogger, getTmpPath } from '../node';

describe('createCLILogger', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('prints plain ERROR lines when no colours are injected', () => {
    createCLILogger().error('boom');
    expect(errorSpy).toHaveBeenCalledWith('boom');
  });

  it('formats console output with the injected colour, never the ring line', () => {
    const lines: Array<[Level, string]> = [];
    createCLILogger(
      { onLine: (level, message) => lines.push([level, message]) },
      { error: (line) => `<red>${line}</red>` },
    ).error('boom');

    expect(errorSpy).toHaveBeenCalledWith('<red>boom</red>');
    expect(lines).toEqual([[Level.ERROR, 'boom']]);
  });

  it('scrubs secrets before both the ring tap and the console', () => {
    const lines: string[] = [];
    createCLILogger({ onLine: (_level, message) => lines.push(message) }).error(
      'token sk-abcdefghijklmnopqrstuvwxyz123456',
    );

    expect(lines[0]).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
    expect(errorSpy.mock.calls[0][0]).toBe(lines[0]);
  });

  it('masks known secret values in the message and the serialized context', () => {
    const sa = JSON.stringify(
      { private_key: 'plain\nkey', client_email: 'svc@proj' },
      null,
      2,
    );
    const lines: string[] = [];
    createCLILogger({
      knownSecrets: ['value-123', sa],
      onLine: (_level, message) => lines.push(message),
    }).error('auth failed with value-123', { credentials: sa });

    expect(lines[0]).not.toContain('value-123');
    expect(lines[0]).not.toContain('svc@proj');
    expect(lines[0]).toContain('auth failed with ***');
  });

  it('reads function-form known secrets per line', () => {
    const known: string[] = [];
    const lines: string[] = [];
    const logger = createCLILogger({
      knownSecrets: () => known,
      onLine: (_level, message) => lines.push(message),
    });

    logger.error('first late-value-42');
    known.push('late-value-42');
    logger.error('second late-value-42');

    expect(lines).toEqual(['first late-value-42', 'second ***']);
  });

  it('copies array-form known secrets at creation', () => {
    const known = ['early-value-42'];
    const lines: string[] = [];
    const logger = createCLILogger({
      knownSecrets: known,
      onLine: (_level, message) => lines.push(message),
    });

    known.push('late-value-42');
    logger.error('early-value-42 late-value-42');

    expect(lines).toEqual(['*** late-value-42']);
  });

  describe('temp root', () => {
    const root = '/var/folders/7x/k2m9n4p5q6r7s8t9v0w1x2y3z40000gn/T';
    let tmpdirSpy: jest.SpyInstance;

    beforeEach(() => {
      tmpdirSpy = jest.spyOn(os, 'tmpdir').mockReturnValue(root);
    });

    afterEach(() => {
      tmpdirSpy.mockRestore();
    });

    it('shows the root as $TMPDIR and still masks a secret on the line', () => {
      const lines: string[] = [];
      createCLILogger({
        onLine: (_level, message) => lines.push(message),
      }).error(
        `Output: ${root}/walkeros/push/ab12cd/flow.mjs token=sk_live_abcdefghijklmnop`,
      );

      expect(lines[0]).toContain(
        'Output: $TMPDIR/walkeros/push/ab12cd/flow.mjs',
      );
      expect(lines[0]).not.toContain(root);
      expect(lines[0]).not.toContain('sk_live_abcdefghijklmnop');
    });

    it('labels only a root that starts a path', () => {
      tmpdirSpy.mockReturnValue('/tmp');
      const lines: string[] = [];
      createCLILogger({
        onLine: (_level, message) => lines.push(message),
      }).error('copy /mnt/tmp/x to "/tmp/y" and /tmpfoo/z');

      expect(lines[0]).toBe('copy /mnt/tmp/x to "$TMPDIR/y" and /tmpfoo/z');
    });

    it.each([
      ['a URL holding the root', 'sqlite:/tmp/db?pw=hunter2hunter2'],
      ['base64 holding the root', 'QmFzZTY0+/tmp/U2VjcmV0S2V5'],
    ])('still masks a known secret that is %s', (_l, secret) => {
      tmpdirSpy.mockReturnValue('/tmp');
      const lines: string[] = [];
      createCLILogger({
        knownSecrets: [secret],
        onLine: (_level, message) => lines.push(message),
      }).error(`connect ${secret} failed`);

      expect(lines).toEqual(['connect *** failed']);
    });

    it('masks a known secret that only touches the root at its edge', () => {
      tmpdirSpy.mockReturnValue('/tmp');
      const lines: string[] = [];
      createCLILogger({
        knownSecrets: ['mp/hunter2hunter2'],
        onLine: (_level, message) => lines.push(message),
      }).error('read /tmp/hunter2hunter2');

      expect(lines).toEqual(['read /t***']);
    });

    it('leaves a line without the root unchanged', () => {
      const lines: string[] = [];
      createCLILogger({
        onLine: (_level, message) => lines.push(message),
      }).error('Output: ./dist/flow.mjs');

      expect(lines).toEqual(['Output: ./dist/flow.mjs']);
    });
  });
});

describe('getTmpPath', () => {
  it('joins segments under an absolute custom root', () => {
    expect(getTmpPath('/custom', 'cache', 'builds')).toBe(
      '/custom/cache/builds',
    );
  });
});
