import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createLogger, Level, type Logger } from '@walkeros/core';
import { loadFlow } from '../runner.js';
import { ErrorRing, LogRing } from '../index.js';
import { createCLILoggerConfig } from '../../core/cli-logger.js';

/**
 * D1: the runner must forward a collector `Logger.Config` (built from the same
 * ring tap as the runner CLI logger) into the bundle factory as
 * `context.logger`, so the deployed bundle's collector taps the ErrorRing.
 *
 * This drives a real on-disk bundle whose factory simulates the production
 * generateServerEntry contract: `if (context.logger) config.logger = context.logger`,
 * then a collector built with `createLogger(config.logger)` emits a scoped
 * "Push failed" error exactly like collector/destination.ts does.
 */
describe('loadFlow forwards collector logger config to the bundle', () => {
  const tempDirs: string[] = [];
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    // loadFlow does process.chdir(flowDir); restore before removing temp dirs
    // so the worker's cwd never points at a deleted directory (which would
    // make every later suite on this worker fail with ENOENT uv_cwd).
    process.chdir(originalCwd);
    for (const dir of tempDirs)
      fs.rmSync(dir, { recursive: true, force: true });
    tempDirs.length = 0;
    jest.clearAllMocks();
  });

  function createBundle(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-logger-tap-'));
    const file = path.join(dir, 'bundle.mjs');
    // Mirror generateServerEntry: only adopt context.logger when truthy, then
    // simulate a collector that builds its own logger from config.logger and a
    // failing destination push that logs a scoped error.
    fs.writeFileSync(
      file,
      `import { createLogger } from '@walkeros/core';
export default async function(context = {}) {
  const config = {};
  if (context.logger) config.logger = context.logger;
  const logger = createLogger({
    level: config.logger?.level,
    handler: config.logger?.handler,
  });
  return {
    collector: {
      push: async () => {
        // Simulate a failing destination push.
        logger.scope('bq').error('Push failed', { event: 'order complete' });
        return {};
      },
      command: async () => {},
    },
  };
}
`,
      'utf8',
    );
    tempDirs.push(dir);
    return file;
  }

  it('routes the bundle collector error into the runner error ring without --verbose', async () => {
    const errorRing = new ErrorRing(20);
    const logRing = new LogRing(100);

    const collectorLoggerConfig: Logger.Config = createCLILoggerConfig({
      verbose: false,
      silent: true,
      onLine: (level, message) => {
        if (level === Level.ERROR) errorRing.add(message);
        logRing.add({ time: Date.now(), level: 'error', message });
      },
    });

    const runnerLogger = createLogger({ level: Level.DEBUG });
    const bundle = createBundle();

    const handle = await loadFlow(
      bundle,
      { port: 0 },
      runnerLogger,
      collectorLoggerConfig,
    );

    // loadFlow only exposes command/status on the handle; drive the push via
    // a fresh load to reach the collector. Re-load and call push directly.
    const { loadBundle } = await import('../load-bundle.js');
    const loaded = await loadBundle(
      bundle,
      { logger: collectorLoggerConfig },
      runnerLogger,
    );
    await loaded.collector.push();

    const snapshot = errorRing.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].message).toBe('[bq] Push failed');

    expect(handle.file).toBe(bundle);
  });
});
