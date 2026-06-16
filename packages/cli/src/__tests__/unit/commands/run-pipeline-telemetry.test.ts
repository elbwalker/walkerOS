/**
 * Telemetry wiring tests for the runtime pipeline.
 *
 * The pipeline reads WALKEROS_OBSERVER_URL (the observer base) +
 * WALKEROS_INGEST_TOKEN + WALKEROS_DEPLOYMENT_ID at boot and (when all are
 * present) builds a single-element observer array via createBatchedPoster
 * (POSTing to `${base}/ingest/${deploymentId}`) + createTelemetryObserver,
 * then forwards it to loadFlow as the 6th argument. When any of those env
 * vars is missing, no observers are passed (the bundle sees undefined and
 * skips the install loop).
 *
 * The active trace window arrives via the trace-poller, which writes the
 * shared `traceUntil` holder in @walkeros/core; the pipeline supplier reads
 * it per emit.
 *
 * WALKEROS_OBSERVE_LEVEL sets the baseline telemetry level (off | standard |
 * trace) fed into the resolver's `observe` block; `traceUntil` keeps higher
 * priority. A trace baseline also skips the trace poller.
 */
import { resolveTelemetryOptions, setTraceUntil } from '@walkeros/core';
import type { FlowState, ObserverFn } from '@walkeros/core';
import type { PipelineOptions } from '../../../commands/run/pipeline.js';

// Partial core mock: keep the real resolver semantics (spied for call
// inspection) but replace the batched poster with a captured emit so
// invoking an observer in tests performs no HTTP and no batching timers.
const mockEmit = jest.fn();
jest.mock('@walkeros/core', () => {
  const actual =
    jest.requireActual<typeof import('@walkeros/core')>('@walkeros/core');
  return {
    ...actual,
    createBatchedPoster: jest.fn(() => mockEmit),
    resolveTelemetryOptions: jest.fn(actual.resolveTelemetryOptions),
  };
});

jest.mock('../../../runtime/health-server.js', () => ({
  createHealthServer: jest.fn().mockResolvedValue({
    server: {},
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../runtime/runner.js', () => ({
  loadFlow: jest.fn().mockResolvedValue({
    collector: { command: jest.fn(), status: undefined },
    file: '/tmp/bundle.mjs',
  }),
  swapFlow: jest.fn().mockResolvedValue({
    collector: { command: jest.fn(), status: undefined },
    file: '/tmp/bundle.mjs',
  }),
}));

jest.mock('../../../runtime/heartbeat.js', () => ({
  createHeartbeat: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    sendOnce: jest.fn(),
    updateConfigVersion: jest.fn(),
  }),
  getInstanceId: jest.fn().mockReturnValue('test-instance'),
}));

jest.mock('../../../runtime/poller.js', () => ({
  createPoller: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    pollOnce: jest.fn(),
  }),
}));

jest.mock('../../../runtime/trace-poller.js', () => ({
  createTracePoller: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    pollOnce: jest.fn(),
  }),
}));

jest.mock('../../../runtime/secrets-fetcher.js', () => ({
  fetchSecrets: jest.fn().mockResolvedValue({}),
  SecretsHttpError: class extends Error {
    status: number;
    constructor(status: number, text: string) {
      super(`${status} ${text}`);
      this.status = status;
    }
  },
}));

jest.mock('../../../runtime/cache.js', () => ({
  writeCache: jest.fn(),
}));

jest.mock('../../../version.js', () => ({ VERSION: '0.0.0-test' }));

import { loadFlow } from '../../../runtime/runner.js';
import { createTracePoller } from '../../../runtime/trace-poller.js';

async function waitFor(cond: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

describe('runPipeline telemetry wiring', () => {
  let originalProcessOn: typeof process.on;
  let runPipeline: typeof import('../../../commands/run/pipeline.js').runPipeline;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalProcessOn = process.on;
    process.on = jest.fn() as never;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_DEPLOYMENT_ID;
    delete process.env.WALKEROS_OBSERVE_LEVEL;
    setTraceUntil(null);
    const mod = await import('../../../commands/run/pipeline.js');
    runPipeline = mod.runPipeline;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    delete process.env.WALKEROS_OBSERVER_URL;
    delete process.env.WALKEROS_INGEST_TOKEN;
    delete process.env.WALKEROS_DEPLOYMENT_ID;
    delete process.env.WALKEROS_OBSERVE_LEVEL;
    setTraceUntil(null);
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger as never,
  };

  it('passes a single-element observer array when WALKEROS_OBSERVER_URL, WALKEROS_INGEST_TOKEN, and WALKEROS_DEPLOYMENT_ID are set', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    const passed = call[5];
    expect(Array.isArray(passed)).toBe(true);
    expect(passed).toHaveLength(1);
    expect(typeof passed[0]).toBe('function');
  });

  it('passes undefined observers when WALKEROS_OBSERVER_URL is missing', async () => {
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('passes undefined observers when WALKEROS_INGEST_TOKEN is missing', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('passes undefined observers when WALKEROS_DEPLOYMENT_ID is missing', async () => {
    process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
    process.env.WALKEROS_INGEST_TOKEN = 'tok_test';

    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  it('still loads the flow when telemetry is disabled (no env)', async () => {
    void runPipeline(baseOptions);
    await waitFor(() => (loadFlow as jest.Mock).mock.calls.length > 0);

    expect(loadFlow).toHaveBeenCalledTimes(1);
    const call = (loadFlow as jest.Mock).mock.calls[0];
    expect(call[5]).toBeUndefined();
  });

  describe('WALKEROS_OBSERVE_LEVEL', () => {
    const setObserverEnv = () => {
      process.env.WALKEROS_OBSERVER_URL = 'https://observer.example.com';
      process.env.WALKEROS_INGEST_TOKEN = 'tok_test';
      process.env.WALKEROS_DEPLOYMENT_ID = 'dep_42';
    };

    const makeState = (): FlowState => ({
      flowId: 'flow',
      stepId: 'destination.test',
      stepType: 'destination',
      phase: 'in',
      eventId: 'evt-1',
      timestamp: '2026-06-11T00:00:00.000Z',
      elapsedMs: 1,
      inEvent: { name: 'page view' },
    });

    async function startAndGetObserver(): Promise<ObserverFn> {
      void runPipeline(baseOptions);
      await waitFor(() => jest.mocked(loadFlow).mock.calls.length > 0);
      const firstCall = jest.mocked(loadFlow).mock.calls[0];
      if (!firstCall) throw new Error('loadFlow was not called');
      const observers = firstCall[5];
      const observer = observers?.[0];
      if (!observer || observers.length !== 1) {
        throw new Error('expected a single telemetry observer');
      }
      return observer;
    }

    it('trace: per-emit supplier passes observe { level: trace } to the resolver and payloads survive projection', async () => {
      setObserverEnv();
      process.env.WALKEROS_OBSERVE_LEVEL = 'trace';

      const observer = await startAndGetObserver();
      observer(makeState());

      const resolveSpy = jest.mocked(resolveTelemetryOptions);
      expect(resolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ observe: { level: 'trace' } }),
      );
      expect(resolveSpy).toHaveLastReturnedWith(
        expect.objectContaining({ level: 'trace' }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({ inEvent: { name: 'page view' } }),
      );
    });

    it('off: telemetry resolves to null and nothing is emitted', async () => {
      setObserverEnv();
      process.env.WALKEROS_OBSERVE_LEVEL = 'off';

      const observer = await startAndGetObserver();
      observer(makeState());

      expect(jest.mocked(resolveTelemetryOptions)).toHaveLastReturnedWith(null);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('unset: no observe block, standard level, traceUntil still elevates', async () => {
      setObserverEnv();

      const observer = await startAndGetObserver();
      observer(makeState());

      const resolveSpy = jest.mocked(resolveTelemetryOptions);
      const firstResolveCall = resolveSpy.mock.calls[0];
      if (!firstResolveCall) throw new Error('resolver was not called');
      expect(firstResolveCall[0].observe).toBeUndefined();
      expect(resolveSpy).toHaveLastReturnedWith(
        expect.objectContaining({ level: 'standard' }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        expect.not.objectContaining({ inEvent: expect.anything() }),
      );

      setTraceUntil(new Date(Date.now() + 60_000).toISOString());
      observer(makeState());
      expect(resolveSpy).toHaveLastReturnedWith(
        expect.objectContaining({ level: 'trace' }),
      );
    });

    it('invalid value: warns once, treated as unset, poller still starts', async () => {
      setObserverEnv();
      process.env.WALKEROS_OBSERVE_LEVEL = 'verbose';

      const observer = await startAndGetObserver();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WALKEROS_OBSERVE_LEVEL'),
      );

      observer(makeState());
      expect(jest.mocked(resolveTelemetryOptions)).toHaveLastReturnedWith(
        expect.objectContaining({ level: 'standard' }),
      );

      await waitFor(() => jest.mocked(createTracePoller).mock.calls.length > 0);
      const pollerResult = jest.mocked(createTracePoller).mock.results[0];
      if (!pollerResult || pollerResult.type !== 'return') {
        throw new Error('trace poller was not created');
      }
      expect(pollerResult.value.start).toHaveBeenCalled();
    });

    it('trace: skips starting the trace poller (nothing to elevate)', async () => {
      setObserverEnv();
      process.env.WALKEROS_OBSERVE_LEVEL = 'trace';

      void runPipeline(baseOptions);
      await waitFor(() =>
        mockLogger.info.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('Trace poller: skipped'),
        ),
      );
      expect(createTracePoller).not.toHaveBeenCalled();
    });

    it('unset: trace poller starts when observer env is present', async () => {
      setObserverEnv();

      void runPipeline(baseOptions);
      await waitFor(() => jest.mocked(createTracePoller).mock.calls.length > 0);
      const pollerResult = jest.mocked(createTracePoller).mock.results[0];
      if (!pollerResult || pollerResult.type !== 'return') {
        throw new Error('trace poller was not created');
      }
      expect(pollerResult.value.start).toHaveBeenCalled();
    });
  });
});
