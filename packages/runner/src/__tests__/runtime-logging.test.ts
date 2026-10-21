import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Level } from '@walkeros/core';
import type { LogEntry } from '@walkeros/core/node';
import { createRuntimeLogging } from '../runtime-logging.js';
import { loadFlow } from '../runner.js';

/**
 * E17: the flow's own `logger: { level, format }` reaches the runner. The
 * bundle reports it through the flow logger hook before its collector
 * starts; the runner's lines and the collector's then share its format.
 */
describe('createRuntimeLogging', () => {
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

  const parse = (value: unknown): unknown => JSON.parse(String(value));

  it("switches the runner's own lines to the flow's format once the bundle reports it", () => {
    const logging = createRuntimeLogging({});
    logging.logger.info('Starting flow...');
    logging.flowLogger.onLogger({ level: 'WARN', format: 'json' });
    logging.logger.scope('runner').info('Flow running');

    expect(logSpy.mock.calls[0][0]).toBe('Starting flow...');
    expect(parse(logSpy.mock.calls[1][0])).toMatchObject({
      severity: 'INFO',
      message: '[runner] Flow running',
      scope: 'runner',
    });
    expect(logging.format()).toBe('json');
  });

  it('keeps text when the flow names no format', () => {
    const logging = createRuntimeLogging({});
    logging.flowLogger.onLogger({ level: 'WARN' });
    logging.logger.warn('plain');
    expect(logSpy).toHaveBeenCalledWith('plain');
  });

  it('forces DEBUG over the flow level only with --verbose', () => {
    expect(createRuntimeLogging({ verbose: true }).flowLogger.logLevel).toBe(
      Level.DEBUG,
    );
    expect(createRuntimeLogging({}).flowLogger).not.toHaveProperty('logLevel');
  });

  it('hands the tap the structured fields of a collector line next to the text line', () => {
    const taps: Array<[Level, string, LogEntry]> = [];
    const { collectorConfig } = createRuntimeLogging({
      silent: true,
      onLine: (level, message, entry) => taps.push([level, message, entry]),
    });
    collectorConfig.handler?.(
      Level.ERROR,
      'Push failed',
      { code: 'transport', status: 503, retryable: true, suppressed: 3 },
      ['destination', 'api'],
      () => {},
    );

    expect(taps).toEqual([
      [
        Level.ERROR,
        '[destination:api] Push failed {"code":"transport","status":503,"retryable":true,"suppressed":3}',
        expect.objectContaining({
          severity: 'ERROR',
          scope: 'destination:api',
          context: {
            code: 'transport',
            status: 503,
            retryable: true,
            suppressed: 3,
          },
        }),
      ],
    ]);
  });
});

describe('loadFlow hands the bundle the flow logger contract', () => {
  const parse = (value: unknown): unknown => JSON.parse(String(value));
  const dirs: string[] = [];
  let originalCwd: string;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    originalCwd = process.cwd();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    process.chdir(originalCwd);
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  it('reports the flow format before the collector logs, and the runner follows it', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-logging-'));
    dirs.push(dir);
    const file = path.join(dir, 'bundle.mjs');
    // A bundle factory honouring the contract the CLI's server entry emits:
    // report the flow's settings, then build the collector's logger from the
    // host config with the flow's level.
    fs.writeFileSync(
      file,
      `import { createLogger } from '@walkeros/core';
export default async function(context = {}) {
  const own = { level: 'WARN', format: 'json' };
  context.onLogger?.(own);
  const logger = createLogger({
    ...context.logger,
    level: context.logLevel ?? own.level,
  });
  logger.scope('api').info('hidden by the flow level');
  logger.scope('api').warn('collector warning');
  return { collector: { push: async () => ({}), command: async () => {} } };
}
`,
    );

    const logging = createRuntimeLogging({});
    await loadFlow(
      file,
      { port: 0, ...logging.flowLogger },
      logging.logger,
      logging.collectorConfig,
    );
    logging.logger.info('Flow running');

    expect(errorSpy.mock.calls.map((call) => parse(call[0]))).toEqual([
      expect.objectContaining({
        severity: 'WARNING',
        message: '[api] collector warning',
      }),
    ]);
    expect(parse(logSpy.mock.calls.at(-1)?.[0])).toMatchObject({
      severity: 'INFO',
      message: 'Flow running',
    });
    expect(
      logSpy.mock.calls.some((call) =>
        String(call[0]).includes('hidden by the flow level'),
      ),
    ).toBe(false);
  });
});
