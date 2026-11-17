import http from 'http';
import type { DeclaredEnv } from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import type { PipelineOptions } from '../pipeline.js';
import type { HealthServer } from '../health-server.js';
import type { FlowHandle } from '../runner.js';

// Mock all runtime modules
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

jest.mock('../runner.js', () => ({
  loadFlow: jest.fn().mockResolvedValue({
    collector: { command: jest.fn(), status: undefined },
    file: '/tmp/bundle.mjs',
  }),
}));

jest.mock('../heartbeat.js', () => ({
  createHeartbeat: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    sendOnce: jest.fn(),
  }),
  getInstanceId: jest.fn().mockReturnValue('test-instance'),
}));

jest.mock('../secrets-fetcher.js', () => ({
  fetchSecrets: jest.fn().mockResolvedValue({}),
  SecretsHttpError: class extends Error {
    status: number;
    constructor(status: number, text: string) {
      super(`${status} ${text}`);
      this.status = status;
    }
  },
}));

jest.mock('../version.js', () => ({ VERSION: '0.0.0-test' }));

import { createHealthServer } from '../health-server.js';
import { loadFlow } from '../runner.js';
import { createHeartbeat } from '../heartbeat.js';
import { fetchSecrets } from '../secrets-fetcher.js';
import { createMockLogger } from './helpers/mock-logger.js';
import { RunnerAuthError } from '../runner-auth-error.js';

const mockLogger = createMockLogger();

const API: NonNullable<PipelineOptions['api']> = {
  appUrl: 'https://app.walkeros.io',
  token: 'test-token',
  projectId: 'proj_123',
  flowId: 'flow_456',
  heartbeatIntervalMs: 60000,
  cacheDir: '/tmp/cache',
};

/**
 * A loadFlow stand-in that does what loadBundle does around the factory: it
 * hands the artifact's declaration to the pipeline's beforeStart, and starts
 * the flow (calls `started`) only when beforeStart resolves.
 */
function loading(
  declared: DeclaredEnv | undefined,
  collector: FlowHandle['collector'] = { command: jest.fn() },
  started: () => void = () => {},
): typeof loadFlow {
  return async (
    _file,
    _config,
    _logger,
    _loggerConfig,
    _healthServer,
    beforeStart,
  ) => {
    await beforeStart?.(declared);
    started();
    return { collector, file: '/tmp/bundle.mjs' };
  };
}

/** Restore process.env names a test set. */
function unset(names: readonly string[]): void {
  for (const name of names) delete process.env[name];
}

/** A typed HealthServer fake: spies for every method, a real (unbound) server. */
function fakeHealthServer(overrides: Partial<HealthServer> = {}): HealthServer {
  return {
    server: new http.Server(),
    setFlowHandler: jest.fn(),
    setReady: jest.fn(),
    setFailed: jest.fn(),
    setDegraded: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('runPipeline', () => {
  let runPipeline: typeof import('../pipeline.js').runPipeline;
  let resetProcessGuardsForTest: typeof import('../pipeline.js').resetProcessGuardsForTest;
  let processOnMock: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Prevent actual signal handlers and process.exit; spyOn keeps the real
    // signature so .mock.calls / .mock.invocationCallOrder stay typed.
    processOnMock = jest.spyOn(process, 'on').mockReturnValue(process);
    // Dynamic import to get fresh module with mocks
    const mod = await import('../pipeline.js');
    runPipeline = mod.runPipeline;
    resetProcessGuardsForTest = mod.resetProcessGuardsForTest;
    // The guard latch is module-global and survives across tests in this file;
    // reset it so each runPipeline registers its guards fresh.
    resetProcessGuardsForTest();
    // Reset, not only clear: a queued once-value must not reach the next test.
    jest.mocked(loadFlow).mockReset().mockImplementation(loading(undefined));
    jest.mocked(fetchSecrets).mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    processOnMock.mockRestore();
  });

  const baseOptions: PipelineOptions = {
    bundlePath: '/tmp/test-bundle.mjs',
    port: 8080,
    logger: mockLogger,
    knownValues: createKnownValues(),
  };

  it('creates health server and loads flow in standalone mode', async () => {
    const promise = runPipeline(baseOptions);

    // Let microtasks settle
    await new Promise((r) => setTimeout(r, 50));

    expect(createHealthServer).toHaveBeenCalledWith(8080, mockLogger);
    expect(loadFlow).toHaveBeenCalledWith(
      '/tmp/test-bundle.mjs',
      { port: 8080 },
      mockLogger,
      undefined,
      expect.any(Object), // healthServer
      expect.any(Function), // beforeStart
    );
    expect(createHeartbeat).not.toHaveBeenCalled();
    expect(fetchSecrets).not.toHaveBeenCalled();

    // Registers signal handlers
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('forces exit 1 nine seconds after SIGTERM when the drain hangs', async () => {
    jest
      .mocked(loadFlow)
      .mockImplementation(
        loading(undefined, { command: () => new Promise<unknown>(() => {}) }),
      );
    void runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 50));
    const sigterm = processOnMock.mock.calls.find(
      ([event]) => event === 'SIGTERM',
    )?.[1];
    if (typeof sigterm !== 'function') throw new Error('no SIGTERM handler');
    const exits: unknown[] = [];
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      exits.push(code);
      throw new Error(`__exit__:${code}`);
    });
    jest.useFakeTimers();
    try {
      sigterm();
      await jest.advanceTimersByTimeAsync(8999);
      expect(exits).toEqual([]);

      await expect(jest.advanceTimersByTimeAsync(1)).rejects.toThrow(
        '__exit__:1',
      );
      expect(exits).toEqual([1]);
    } finally {
      jest.useRealTimers();
      exitSpy.mockRestore();
    }
  });

  it('registers the process error guards BEFORE the health server and flow load', async () => {
    // The net must be up before any construction (health server, flow load,
    // openWriter) so an init-window stray emit lands in the guard instead of
    // crashing the container. process.on is mocked here, so the guard's
    // registration of 'uncaughtException' is captured and we can compare call
    // order against the health-server/load-flow mocks. This is the first test
    // to drive runPipeline, so the one-shot guard latch still registers fresh.
    runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 50));

    const guardCall = processOnMock.mock.calls.findIndex(
      ([event]) => event === 'uncaughtException',
    );
    expect(guardCall).toBeGreaterThanOrEqual(0);
    const guardOrder = processOnMock.mock.invocationCallOrder[guardCall];

    const healthMock = jest.mocked(createHealthServer);
    const loadMock = jest.mocked(loadFlow);
    const healthOrder = healthMock.mock.invocationCallOrder[0];
    const loadOrder = loadMock.mock.invocationCallOrder[0];

    expect(guardOrder).toBeLessThan(healthOrder);
    expect(guardOrder).toBeLessThan(loadOrder);
  });

  it('auto-degrades /ready after a sustained out-of-band error loop, not a single stray', async () => {
    const mockSetDegraded = jest.fn();
    jest
      .mocked(createHealthServer)
      .mockResolvedValue(fakeHealthServer({ setDegraded: mockSetDegraded }));

    runPipeline(baseOptions);
    await new Promise((r) => setTimeout(r, 50));

    // Extract the guard's uncaughtException listener that runPipeline registered.
    const guardEntry = processOnMock.mock.calls.find(
      ([event]) => event === 'uncaughtException',
    );
    expect(guardEntry).toBeDefined();
    const guard = guardEntry?.[1];
    expect(typeof guard).toBe('function');
    if (typeof guard !== 'function') throw new Error('guard not a function');

    // A single stray error self-heals (stays 200).
    guard(new Error('stray'));
    expect(mockSetDegraded).not.toHaveBeenCalled();

    // Four more within the window cross the threshold (5) and degrade.
    guard(new Error('e2'));
    guard(new Error('e3'));
    guard(new Error('e4'));
    expect(mockSetDegraded).not.toHaveBeenCalled();
    guard(new Error('e5'));
    expect(mockSetDegraded).toHaveBeenCalledTimes(1);
    expect(mockSetDegraded).toHaveBeenCalledWith('out-of-band error loop');
  });

  it('enables heartbeat and secrets when api config provided', async () => {
    const apiOptions: PipelineOptions = { ...baseOptions, api: API };

    const promise = runPipeline(apiOptions);
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSecrets).toHaveBeenCalledWith({
      appUrl: 'https://app.walkeros.io',
      token: 'test-token',
      projectId: 'proj_123',
      flowId: 'flow_456',
    });
    expect(createHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({
        appUrl: 'https://app.walkeros.io',
        token: 'test-token',
        projectId: 'proj_123',
        flowId: 'flow_456',
        intervalMs: 60000,
        knownValues: apiOptions.knownValues,
      }),
      mockLogger,
    );
  });

  it('fetches the secrets once the health server is up, so /ready answers 503 meanwhile', async () => {
    void runPipeline({ ...baseOptions, api: API });
    await new Promise((r) => setTimeout(r, 50));

    const healthOrder =
      jest.mocked(createHealthServer).mock.invocationCallOrder[0];
    const fetchOrder = jest.mocked(fetchSecrets).mock.invocationCallOrder[0];
    expect(healthOrder).toBeLessThan(fetchOrder);
  });

  it('hands the heartbeat the release the loaded artifact baked', async () => {
    jest
      .mocked(loadFlow)
      .mockImplementationOnce(
        loading(undefined, { command: jest.fn(), release: '41' }),
      );

    void runPipeline({ ...baseOptions, api: API });
    await new Promise((r) => setTimeout(r, 50));

    expect(createHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({ release: '41' }),
      mockLogger,
    );
  });

  describe('secret injection', () => {
    const NAMES = ['API_KEY', 'OLD_KEY', 'DB_HOST'];

    afterEach(() => unset(NAMES));

    /**
     * Boot until the flow is ready or the boot fails. `started` reports
     * whether the flow's factory ran, and the known values as they stood then.
     */
    async function boot(
      declared: DeclaredEnv | undefined,
      options: PipelineOptions,
    ) {
      let reportReady = () => {};
      const ready = new Promise<string>((resolve) => {
        reportReady = () => resolve('ready');
      });
      const setReady = jest.fn((value: boolean) => {
        if (value) reportReady();
      });
      const setFailed = jest.fn();
      jest
        .mocked(createHealthServer)
        .mockResolvedValueOnce(fakeHealthServer({ setReady, setFailed }));
      const started: { known?: readonly string[] } = {};
      jest.mocked(loadFlow).mockImplementationOnce(
        loading(declared, { command: jest.fn() }, () => {
          started.known = [...options.knownValues.values()];
        }),
      );

      const failed = runPipeline(options).catch((error: unknown) => error);
      const outcome = await Promise.race([ready, failed]);
      return { outcome, setReady, setFailed, started };
    }

    it('refuses the boot when a delivered name is already set in the environment', async () => {
      process.env.API_KEY = 'value-from-host';
      jest
        .mocked(fetchSecrets)
        .mockResolvedValueOnce({ API_KEY: 'value-abc123' });

      const { outcome, setReady, setFailed, started } = await boot(
        { secrets: ['API_KEY'], env: [] },
        { ...baseOptions, knownValues: createKnownValues(), api: API },
      );

      const message = 'Secrets refused: API_KEY (secret-in-env)';
      expect(outcome).toEqual(new Error(message));
      expect(setFailed).toHaveBeenCalledWith(message);
      expect(setReady).not.toHaveBeenCalledWith(true);
      expect(started.known).toBeUndefined();
      expect(process.env.API_KEY).toBe('value-from-host');
    });

    it.each<[string, DeclaredEnv | undefined, string[], string[]]>([
      [
        'every delivered name for an artifact without the export',
        undefined,
        ['API_KEY', 'OLD_KEY'],
        ['Injected 2 secret(s) into environment'],
      ],
      [
        'only the names the artifact declares',
        { secrets: ['API_KEY'], env: [] },
        ['API_KEY'],
        [
          'Injected 1 secret(s) into environment',
          'Not injected, the flow does not read them: OLD_KEY',
        ],
      ],
    ])('sets %s', async (_case, declared, set, lines) => {
      jest.mocked(fetchSecrets).mockResolvedValueOnce({
        API_KEY: 'value-abc123',
        OLD_KEY: 'value-old123',
      });

      const { outcome } = await boot(declared, {
        ...baseOptions,
        knownValues: createKnownValues(),
        api: API,
      });

      expect(outcome).toBe('ready');
      expect(NAMES.filter((name) => process.env[name] !== undefined)).toEqual(
        set,
      );
      for (const line of lines)
        expect(mockLogger.info).toHaveBeenCalledWith(line);
    });

    it.each<[string, PipelineOptions['api'], string[]]>([
      ['with the app', API, ['value-abc123', 'value-old123', 'db.internal']],
      ['without the app', undefined, ['db.internal']],
    ])(
      'knows every delivered value and every declared value before the flow starts, %s',
      async (_case, api, known) => {
        process.env.DB_HOST = 'db.internal';
        jest.mocked(fetchSecrets).mockResolvedValueOnce({
          API_KEY: 'value-abc123',
          OLD_KEY: 'value-old123',
        });

        const { outcome, started } = await boot(
          { secrets: ['API_KEY'], env: ['DB_HOST'] },
          { ...baseOptions, knownValues: createKnownValues(), api },
        );

        expect(outcome).toBe('ready');
        expect(started.known).toEqual(known);
      },
    );

    it('boots on without the app secrets when the fetch fails for another reason than auth', async () => {
      jest
        .mocked(fetchSecrets)
        .mockRejectedValueOnce(new Error('network down'));
      const knownValues = createKnownValues();

      const { outcome } = await boot(
        { secrets: ['API_KEY'], env: [] },
        { ...baseOptions, knownValues, api: API },
      );

      expect(outcome).toBe('ready');
      expect(knownValues.values()).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not fetch secrets: network down',
      );
    });

    it('stops the boot before the flow starts when the secrets fetch reports a revoked token', async () => {
      jest
        .mocked(fetchSecrets)
        .mockRejectedValueOnce(
          new RunnerAuthError(401, 'unauthorised', null, 'token revoked'),
        );

      const { outcome, setReady, started } = await boot(
        { secrets: ['API_KEY'], env: [] },
        { ...baseOptions, api: { ...API, token: 'revoked-token' } },
      );

      expect(outcome).toBeInstanceOf(RunnerAuthError);
      expect(setReady).not.toHaveBeenCalledWith(true);
      expect(started.known).toBeUndefined();
      expect(createHeartbeat).not.toHaveBeenCalled();
    });
  });

  it('marks readiness failed and closes health server if loadFlow fails', async () => {
    const mockClose = jest.fn().mockResolvedValue(undefined);
    const mockSetFailed = jest.fn();
    const mockSetReady = jest.fn();
    jest.mocked(createHealthServer).mockResolvedValue(
      fakeHealthServer({
        setReady: mockSetReady,
        setFailed: mockSetFailed,
        close: mockClose,
      }),
    );
    jest.mocked(loadFlow).mockRejectedValueOnce(new Error('bad bundle'));

    await expect(runPipeline(baseOptions)).rejects.toThrow('bad bundle');
    // Fail-fast: /ready must not flip to 200 when construction fails.
    expect(mockSetFailed).toHaveBeenCalledWith('bad bundle');
    expect(mockSetReady).not.toHaveBeenCalledWith(true);
    expect(mockClose).toHaveBeenCalled();
  });

  describe('artifact release check', () => {
    type Identity = Pick<FlowHandle['collector'], 'name' | 'release'>;

    afterEach(() => {
      delete process.env.WALKEROS_FLOW_RELEASE;
      delete process.env.WALKEROS_FLOW_NAME;
    });

    /**
     * Boot with `env` set and a bundle that baked `identity` onto its
     * collector, until the pipeline reports ready or fails. runPipeline never
     * returns once ready, so readiness is observed through setReady(true).
     */
    async function boot(
      env: Record<string, string>,
      identity: Identity,
      options: PipelineOptions = baseOptions,
    ) {
      Object.assign(process.env, env);
      let reportReady = () => {};
      const ready = new Promise<string>((resolve) => {
        reportReady = () => resolve('ready');
      });
      const setReady = jest.fn((value: boolean) => {
        if (value) reportReady();
      });
      const setFailed = jest.fn();
      const close = jest.fn().mockResolvedValue(undefined);
      jest
        .mocked(createHealthServer)
        .mockResolvedValueOnce(
          fakeHealthServer({ setReady, setFailed, close }),
        );
      jest
        .mocked(loadFlow)
        .mockImplementationOnce(
          loading(undefined, { command: jest.fn(), ...identity }),
        );

      const failed = runPipeline(options).catch((error: unknown) => error);
      const outcome = await Promise.race([ready, failed]);
      return { outcome, setReady, setFailed, close };
    }

    it.each<[string, Record<string, string>, Identity, string]>([
      [
        'another release',
        { WALKEROS_FLOW_RELEASE: '42', WALKEROS_FLOW_NAME: 'default' },
        { name: 'default', release: '41' },
        'Artifact mismatch: expected default@42, loaded default@41',
      ],
      [
        'another flow name',
        { WALKEROS_FLOW_RELEASE: '42', WALKEROS_FLOW_NAME: 'web' },
        { name: 'default', release: '42' },
        'Artifact mismatch: expected web@42, loaded default@42',
      ],
      [
        'no release',
        { WALKEROS_FLOW_RELEASE: '42' },
        { name: 'default' },
        'Artifact mismatch: expected default@42, loaded default@(none)',
      ],
    ])(
      'refuses an artifact with %s and never reports ready',
      async (_case, env, identity, message) => {
        const { outcome, setReady, setFailed, close } = await boot(
          env,
          identity,
        );

        expect(outcome).toEqual(new Error(message));
        expect(setFailed).toHaveBeenCalledWith(message);
        expect(setReady).not.toHaveBeenCalledWith(true);
        expect(close).toHaveBeenCalled();
      },
    );

    it.each<[string, Record<string, string>, Identity]>([
      [
        'its release and flow name match',
        { WALKEROS_FLOW_RELEASE: '42', WALKEROS_FLOW_NAME: 'default' },
        { name: 'default', release: '42' },
      ],
      [
        'no release is expected, whatever the flow name',
        { WALKEROS_FLOW_NAME: 'web' },
        { name: 'default', release: '41' },
      ],
      [
        'the expected release is empty',
        { WALKEROS_FLOW_RELEASE: '' },
        { name: 'default', release: '41' },
      ],
    ])('becomes ready when %s', async (_case, env, identity) => {
      const { outcome, setFailed } = await boot(env, identity);

      expect(outcome).toBe('ready');
      expect(setFailed).not.toHaveBeenCalled();
    });

    it('refuses a delivered secret named like the deployed release as reserved', async () => {
      jest
        .mocked(fetchSecrets)
        .mockResolvedValueOnce({ WALKEROS_FLOW_RELEASE: '41' });

      const { outcome, setReady } = await boot(
        { WALKEROS_FLOW_RELEASE: '42' },
        { name: 'default', release: '41' },
        { ...baseOptions, api: API },
      );

      expect(outcome).toEqual(
        new Error('Secrets refused: WALKEROS_FLOW_RELEASE (secret-reserved)'),
      );
      expect(setReady).not.toHaveBeenCalledWith(true);
      expect(process.env.WALKEROS_FLOW_RELEASE).toBe('42');
    });

    it.each<[Record<string, string>, Identity, string]>([
      [
        { WALKEROS_FLOW_RELEASE: '42' },
        { name: 'default', release: '41' },
        'Flow: default release 41',
      ],
      [{}, {}, 'Flow: (unnamed) release (none)'],
    ])(
      'logs the loaded flow at every boot, checked or not',
      async (env, identity, line) => {
        await boot(env, identity);

        expect(mockLogger.info).toHaveBeenCalledWith(line);
      },
    );
  });
});
