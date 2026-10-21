import fs from 'fs';
import os from 'os';
import path from 'path';
import { Level, type Logger } from '@walkeros/core';
import { createCLILoggerConfig, type LogEntry } from '@walkeros/core/node';
import { generateServerEntry } from '../../../commands/bundle/bundler.js';

/**
 * The runner contract's logger merge (E17), run through the generated
 * server entry: a stand-in stage 1 builds the collector's logger from
 * `config.logger` with core's `createLogger`, as the collector does, and
 * logs one line per level. The host is the runner's terminal logger config.
 */
const STAGE1 = `import { createLogger } from '@walkeros/core';
export const calls = [];
export function wireConfig(data) {
  const config = { ...data.collector };
  if (data.withHandler)
    config.logger = {
      ...config.logger,
      handler: (level, message) => calls.push(['flow', message]),
    };
  return config;
}
export async function startFlow(config) {
  calls.push(['startFlow']);
  const logger = createLogger(config.logger).scope('dest');
  logger.debug('debug line');
  logger.info('info line');
  logger.warn('warn line');
  logger.error('Push failed', { code: 'transport', status: 503, retryable: true });
  return { collector: { push: async () => ({}), command: async () => {} } };
}
`;

describe('generateServerEntry merges the flow logger with the host logger', () => {
  const dirs: string[] = [];
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  async function run(
    data: Record<string, unknown>,
    context: (
      format: { current: Logger.Format },
      calls: unknown[],
    ) => Record<string, unknown>,
  ): Promise<{ ring: Array<[Level, string, LogEntry]>; calls: unknown[] }> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-entry-logger-'));
    dirs.push(dir);
    const stage1 = path.join(dir, 'stage1.mjs');
    fs.writeFileSync(stage1, STAGE1);
    const entry = path.join(dir, 'entry.mjs');
    fs.writeFileSync(entry, generateServerEntry(stage1, JSON.stringify(data)));

    const stage: unknown = await import(stage1);
    const module: unknown = await import(entry);
    if (
      typeof stage !== 'object' ||
      stage === null ||
      !('calls' in stage) ||
      !Array.isArray(stage.calls) ||
      typeof module !== 'object' ||
      module === null ||
      !('default' in module) ||
      typeof module.default !== 'function'
    )
      throw new Error('the entry has no default factory');
    const calls: unknown[] = stage.calls;

    const ring: Array<[Level, string, LogEntry]> = [];
    const format: { current: Logger.Format } = { current: 'text' };
    const extra = context(format, calls);
    await module.default({
      ...extra,
      logger: createCLILoggerConfig({
        verbose: extra.verbose === true,
        format: () => format.current,
        onLine: (level, message, line) => {
          ring.push([level, message, line]);
          calls.push(['host', message]);
        },
      }),
    });
    return { ring, calls };
  }

  const parse = (value: unknown): unknown => JSON.parse(String(value));

  it('applies the flow level and format: WARN as JSON lines, INFO suppressed, the ring still fed', async () => {
    const settings: unknown[] = [];
    const { ring } = await run(
      { collector: { logger: { level: 'WARN', format: 'json' } } },
      (format) => ({
        onLogger: (value: { format?: Logger.Format }) => {
          settings.push(value);
          if (value.format) format.current = value.format;
        },
      }),
    );

    expect(settings).toEqual([{ level: 'WARN', format: 'json' }]);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.map((call) => parse(call[0]))).toEqual([
      expect.objectContaining({
        severity: 'WARNING',
        message: '[dest] warn line',
      }),
      expect.objectContaining({
        severity: 'ERROR',
        message: '[dest] Push failed',
        context: { code: 'transport', status: 503, retryable: true },
      }),
    ]);
    expect(ring.map(([level]) => level)).toEqual([Level.WARN, Level.ERROR]);
    expect(ring[1][1]).toBe(
      '[dest] Push failed {"code":"transport","status":503,"retryable":true}',
    );
  });

  it('tells the host the flow settings before the collector starts', async () => {
    const { calls } = await run(
      { collector: { logger: { format: 'json' } } },
      (_format, calls) => ({
        onLogger: (value: unknown) => calls.push(['onLogger', value]),
      }),
    );
    expect(calls.slice(0, 2)).toEqual([
      ['onLogger', { level: undefined, format: 'json' }],
      ['startFlow'],
    ]);
  });

  it('a level the host forces (--verbose) wins over the flow level', async () => {
    const { ring } = await run(
      { collector: { logger: { level: 'ERROR' } } },
      () => ({ logLevel: 'DEBUG', verbose: true }),
    );
    expect(ring.map(([level]) => level)).toEqual([
      Level.DEBUG,
      Level.INFO,
      Level.WARN,
      Level.ERROR,
    ]);
  });

  it('keeps the host default when the flow sets no logger', async () => {
    const { ring } = await run({}, () => ({}));
    // The host passes every level to its handler, which hides DEBUG unless
    // verbose: the same lines reach the terminal as before the merge.
    expect(ring).toHaveLength(4);
    expect(logSpy.mock.calls.map((call) => call[0])).toEqual([
      '[dest] info line',
      '[dest] warn line',
    ]);
  });

  it("runs the flow's own handler and the host's for every line, in that order", async () => {
    const { calls } = await run(
      { collector: { logger: { level: 'WARN' } }, withHandler: true },
      () => ({}),
    );
    expect(calls.slice(1)).toEqual([
      ['flow', 'warn line'],
      ['host', '[dest] warn line'],
      ['flow', 'Push failed'],
      [
        'host',
        '[dest] Push failed {"code":"transport","status":503,"retryable":true}',
      ],
    ]);
  });
});
