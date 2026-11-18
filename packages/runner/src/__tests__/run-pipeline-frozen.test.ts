/**
 * `WALKEROS_CONFIG_FROZEN` is inert. The runtime serves an immutable prebuilt
 * artifact for the life of the process, so there is no hot-swap left to
 * freeze. The app still sets the variable on managed containers until its own
 * cleanup lands; it must change nothing: secrets and the heartbeat start
 * exactly as they do without it.
 */
import type { Logger } from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import type { PipelineOptions } from '../pipeline.js';
import { createMockLogger } from './helpers/mock-logger.js';

jest.mock('../health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
    setDegraded: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../runner.js', () => ({ loadFlow: jest.fn() }));

jest.mock('../heartbeat.js', () => ({
  createHeartbeat: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    sendOnce: jest.fn(),
  }),
}));

jest.mock('../secrets-fetcher.js', () => ({
  fetchSecrets: jest.fn().mockResolvedValue({}),
  SecretsHttpError: class extends Error {},
}));

jest.mock('../version.js', () => ({ VERSION: '0.0.0-test' }));

import { createHeartbeat } from '../heartbeat.js';
import { loadFlow } from '../runner.js';
import { fetchSecrets } from '../secrets-fetcher.js';

async function waitFor(cond: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

function infoLines(logger: Logger.Instance): string[] {
  return jest
    .mocked(logger.info)
    .mock.calls.map(([message]) =>
      typeof message === 'string' ? message : '',
    );
}

describe('runPipeline with WALKEROS_CONFIG_FROZEN set', () => {
  let processOnMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    processOnMock = jest.spyOn(process, 'on').mockReturnValue(process);
    process.env.WALKEROS_CONFIG_FROZEN = '1';
    // As loadBundle does: the pipeline's beforeStart runs, where the secrets
    // are fetched, before the flow starts.
    jest
      .mocked(loadFlow)
      .mockImplementation(
        async (
          _file,
          _config,
          _logger,
          _loggerConfig,
          _health,
          beforeStart,
        ) => {
          await beforeStart?.(undefined);
          return { collector: { command: jest.fn() }, file: '/tmp/bundle.mjs' };
        },
      );
  });

  afterEach(() => {
    processOnMock.mockRestore();
    delete process.env.WALKEROS_CONFIG_FROZEN;
  });

  it('is inert: secrets and heartbeat start as without it, and nothing mentions a freeze', async () => {
    const logger = createMockLogger();
    const options: PipelineOptions = {
      bundlePath: '/tmp/test-bundle.mjs',
      port: 8080,
      logger,
      knownValues: createKnownValues(),
      instanceId: '3f9a2b7c1d4e5f60',
      api: {
        appUrl: 'https://app.walkeros.io',
        token: 'test-token',
        projectId: 'proj_123',
        flowId: 'flow_456',
        heartbeatIntervalMs: 60000,
        cacheDir: '/tmp/cache',
      },
    };

    const { runPipeline } = await import('../pipeline.js');
    void runPipeline(options);
    await waitFor(() => jest.mocked(createHeartbeat).mock.calls.length > 0);

    expect(fetchSecrets).toHaveBeenCalledTimes(1);
    expect(createHeartbeat).toHaveBeenCalledTimes(1);
    expect(infoLines(logger).some((line) => /frozen/i.test(line))).toBe(false);
  });
});
