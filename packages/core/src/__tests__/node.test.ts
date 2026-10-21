import os from 'os';
import { Level } from '../types/logger';
import type { LogEntry } from '../node';
import {
  createCLILogger,
  createCLILoggerConfig,
  getTmpPath,
  MAX_JSON_LINE_BYTES,
} from '../node';
import { createLogger } from '../logger';

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

describe('createCLILogger format json', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  const parse = (call: unknown[]): Record<string, unknown> => {
    const parsed: unknown = JSON.parse(String(call[0]));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new Error('not a JSON object');
    return Object.fromEntries(Object.entries(parsed));
  };

  it('prints one JSON object with exactly severity, message, scope, context and time', () => {
    createCLILogger({ format: 'json' })
      .scope('gcp-bigquery')
      .error('connection error', { code: 'transport', status: 503 });

    const line = parse(errorSpy.mock.calls[0]);
    expect(Object.keys(line).sort()).toEqual([
      'context',
      'message',
      'scope',
      'severity',
      'time',
    ]);
    expect(line).toMatchObject({
      severity: 'ERROR',
      message: '[gcp-bigquery] connection error',
      scope: 'gcp-bigquery',
      context: { code: 'transport', status: 503 },
    });
    expect(new Date(String(line.time)).toISOString()).toBe(line.time);
  });

  it('masks known and pattern secrets in the message and in nested context', () => {
    createCLILogger({
      format: 'json',
      knownSecrets: ['value-123456', '98765432'],
    }).error('auth failed with value-123456 "quoted"\nnext', {
      nested: {
        token: 'value-123456',
        key: 'sk-abcdefghijklmnopqrstuvwxyz123456',
      },
      port: 98765432,
    });

    const raw = String(errorSpy.mock.calls[0][0]);
    expect(raw).not.toContain('value-123456');
    expect(raw).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
    const line = parse(errorSpy.mock.calls[0]);
    expect(line.message).toBe('auth failed with *** "quoted"\nnext');
    expect(line.context).toMatchObject({ port: '***' });
  });

  it('caps a line above 32 KiB with contextTruncated, and it still parses', () => {
    createCLILogger({ format: 'json' }).error('big', {
      rows: 'x"'.repeat(MAX_JSON_LINE_BYTES),
    });

    const raw = String(errorSpy.mock.calls[0][0]);
    expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(MAX_JSON_LINE_BYTES);
    const line = parse(errorSpy.mock.calls[0]);
    expect(line.contextTruncated).toBe(true);
    expect(typeof line.context).toBe('string');
    expect(String(line.context).startsWith('{"rows":"x\\"')).toBe(true);
  });

  it('caps a message above half the cap with messageTruncated, and the line still parses', () => {
    const long = 'é'.repeat(MAX_JSON_LINE_BYTES);
    createCLILogger({ format: 'json' }).error(long, { code: 'transport' });

    const raw = String(errorSpy.mock.calls[0][0]);
    expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(MAX_JSON_LINE_BYTES);
    const line = parse(errorSpy.mock.calls[0]);
    expect(line.messageTruncated).toBe(true);
    expect(String(line.message).startsWith('éé')).toBe(true);
    expect(Buffer.byteLength(String(line.message))).toBeLessThanOrEqual(
      MAX_JSON_LINE_BYTES / 2,
    );
    expect(line.context).toEqual({ code: 'transport' });
  });

  it('opens the DEBUG gate through a function-form verbose', () => {
    let open = false;
    const logger = createCLILogger({ format: 'json', verbose: () => open });
    logger.debug('hidden');
    open = true;
    logger.debug('shown');

    expect(logSpy.mock.calls.map((call) => parse(call).message)).toEqual([
      'shown',
    ]);
  });

  it('sends ERROR and WARN to stderr, INFO and DEBUG to stdout', () => {
    const logger = createCLILogger({ format: 'json', verbose: true });
    logger.error('e');
    logger.warn('w');
    logger.info('i');
    logger.debug('d');

    expect(errorSpy.mock.calls.map((call) => parse(call).severity)).toEqual([
      'ERROR',
      'WARNING',
    ]);
    expect(logSpy.mock.calls.map((call) => parse(call).severity)).toEqual([
      'INFO',
      'DEBUG',
    ]);
  });

  it('reads a function-form format per line', () => {
    let format: 'text' | 'json' = 'text';
    const logger = createCLILogger({ format: () => format });
    logger.error('first');
    format = 'json';
    logger.error('second');

    expect(errorSpy.mock.calls[0][0]).toBe('first');
    expect(parse(errorSpy.mock.calls[1]).message).toBe('second');
  });

  it('keeps text mode and the json option as they were', () => {
    const logger = createCLILogger();
    logger.warn('plain', { a: 1 });
    expect(logSpy).toHaveBeenCalledWith('plain {"a":1}');

    const machine = createCLILogger({ json: true, format: 'json' });
    machine.error('hidden');
    machine.info('hidden');
    machine.json({ ok: true });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenLastCalledWith(
      JSON.stringify({ ok: true }, null, 2),
    );
  });

  it('hands onLine the text line and the structured entry, in both formats', () => {
    const taps: Array<[Level, string, LogEntry]> = [];
    const logger = createLogger(
      createCLILoggerConfig({
        onLine: (level, message, entry) => taps.push([level, message, entry]),
      }),
    ).scope('collector');
    logger.error('Push failed', {
      code: 'transport',
      status: 503,
      retryable: true,
      suppressed: 2,
    });

    expect(taps).toEqual([
      [
        Level.ERROR,
        '[collector] Push failed {"code":"transport","status":503,"retryable":true,"suppressed":2}',
        {
          severity: 'ERROR',
          message: '[collector] Push failed',
          scope: 'collector',
          context: {
            code: 'transport',
            status: 503,
            retryable: true,
            suppressed: 2,
          },
          time: expect.any(String),
        },
      ],
    ]);
  });
});

describe('getTmpPath', () => {
  it('joins segments under an absolute custom root', () => {
    expect(getTmpPath('/custom', 'cache', 'builds')).toBe(
      '/custom/cache/builds',
    );
  });
});
