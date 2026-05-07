import type { Flow, Logger } from '@walkeros/core';
import { setupCommand } from '../index';
import { loadFlowConfig } from '../../../config/loader.js';
import { createMockLogger } from '../../../__tests__/helpers/mock-logger.js';

jest.mock('../../../config/loader.js');
jest.mock('../../../core/output.js', () => {
  const actual = jest.requireActual('../../../core/output.js');
  return { ...actual, writeResult: jest.fn().mockResolvedValue(undefined) };
});

/**
 * Bug G fixture: a destination that exposes the full lifecycle. Each
 * function records its invocation order and the context it received so
 * the test can assert init runs before setup, setup receives the resolved
 * config, and destroy runs last with the same resolved config.
 */
type Call = { fn: 'init' | 'setup' | 'destroy'; config: unknown };
const calls: Call[] = [];

jest.mock(
  '@walkeros/__test-lifecycle-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'lifecycle',
      push: () => {},
      init: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'init', config: ctx.config });
        // Return a brand-new config object that setup/destroy must receive.
        return { resolved: true, originalSettings: ctx.config };
      },
      setup: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'setup', config: ctx.config });
        return { ok: true };
      },
      destroy: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'destroy', config: ctx.config });
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-init-void-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'init-void',
      push: () => {},
      init: async (ctx: { config: { settings?: { mutated?: boolean } } }) => {
        // Mutate input config in place; legal but rare path. Returning
        // void must keep the original config object as the resolved one.
        if (ctx.config && typeof ctx.config === 'object') {
          ctx.config.settings = {
            ...(ctx.config.settings ?? {}),
            mutated: true,
          };
        }
        // No return statement → undefined.
      },
      setup: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'setup', config: ctx.config });
        return { ok: true };
      },
      destroy: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'destroy', config: ctx.config });
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-init-aborts-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'init-aborts',
      push: () => {},
      init: async () => {
        calls.push({ fn: 'init', config: undefined });
        return false;
      },
      setup: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'setup', config: ctx.config });
        return { ok: true };
      },
      destroy: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'destroy', config: ctx.config });
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-no-init-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'no-init',
      push: () => {},
      // No init, no destroy: setup-only path stays unchanged.
      setup: async (ctx: { config: unknown }) => {
        calls.push({ fn: 'setup', config: ctx.config });
        return { ok: true };
      },
    },
  }),
  { virtual: true },
);

// Captures the literal config init received, so the env-marker resolver
// test can verify markers were replaced before init was invoked.
const envInitCalls: { config: unknown; env: unknown }[] = [];
jest.mock(
  '@walkeros/__test-env-marker-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'env-marker',
      push: () => {},
      init: async (ctx: { config: unknown; env: unknown }) => {
        envInitCalls.push({ config: ctx.config, env: ctx.env });
        return { resolved: true };
      },
      setup: async (_ctx: unknown) => ({ ok: true }),
      destroy: async () => {},
    },
  }),
  { virtual: true },
);

const mockedLoadFlowConfig = jest.mocked(loadFlowConfig);

function buildFlow(packageName: string, settings: unknown = { x: 1 }): Flow {
  return {
    config: { platform: 'server' },
    destinations: {
      d: {
        package: packageName,
        config: { settings, setup: true },
      },
    },
  };
}

function mockLoad(flow: Flow): void {
  mockedLoadFlowConfig.mockResolvedValue({
    flowSettings: flow,
    buildOptions: {
      format: 'esm',
      target: 'node18',
      platform: 'node',
      output: './dist',
      packages: {},
      minify: false,
      sourcemap: false,
    },
    flowName: 'default',
    isMultiFlow: false,
    availableFlows: ['default'],
  });
}

describe('setupCommand: init → setup → destroy lifecycle (Bug G)', () => {
  let logger: Logger.Instance;

  beforeEach(() => {
    calls.length = 0;
    logger = createMockLogger();
  });

  afterEach(() => {
    mockedLoadFlowConfig.mockReset();
  });

  test('runs init before setup, then destroy, with the resolved config flowing through', async () => {
    mockLoad(
      buildFlow('@walkeros/__test-lifecycle-destination', { topic: 't' }),
    );

    await setupCommand({ target: 'destination.d', logger });

    // Order: init → setup → destroy.
    expect(calls.map((c) => c.fn)).toEqual(['init', 'setup', 'destroy']);

    // setup and destroy both receive the resolved config returned by init,
    // not the original config that init was given.
    const setupCall = calls.find((c) => c.fn === 'setup');
    const destroyCall = calls.find((c) => c.fn === 'destroy');
    expect(setupCall?.config).toEqual({
      resolved: true,
      originalSettings: { settings: { topic: 't' }, setup: true },
    });
    expect(destroyCall?.config).toEqual(setupCall?.config);
  });

  test('void init reuses the (possibly mutated) input config for setup and destroy', async () => {
    mockLoad(buildFlow('@walkeros/__test-init-void-destination'));

    await setupCommand({ target: 'destination.d', logger });

    // setup ran with the input config object that init mutated in place.
    const setupCall = calls.find((c) => c.fn === 'setup');
    expect(setupCall?.config).toEqual({
      settings: { x: 1, mutated: true },
      setup: true,
    });
    // destroy runs with the same object setup saw.
    const destroyCall = calls.find((c) => c.fn === 'destroy');
    expect(destroyCall?.config).toEqual(setupCall?.config);
  });

  test('init returning false aborts: setup does NOT run, destroy does NOT run', async () => {
    mockLoad(buildFlow('@walkeros/__test-init-aborts-destination'));

    await setupCommand({ target: 'destination.d', logger });

    // Only init was called; setup and destroy skipped because init aborted.
    expect(calls.map((c) => c.fn)).toEqual(['init']);
  });

  test('packages without init still run setup with the original config (back-compat)', async () => {
    mockLoad(buildFlow('@walkeros/__test-no-init-destination'));

    await setupCommand({ target: 'destination.d', logger });

    // No init, no destroy → just setup with the unmodified component.config.
    expect(calls.map((c) => c.fn)).toEqual(['setup']);
    const setupCall = calls[0];
    expect(setupCall.config).toEqual({ settings: { x: 1 }, setup: true });
  });

  test('resolves $env markers in config and env before invoking init', async () => {
    // Server flows are loaded in deferred mode, so $env appears as the
    // sentinel `__WALKEROS_ENV:NAME` marker in the component config.
    // The setup command must replace markers with their `process.env`
    // value before handing the config to the package's init.
    process.env.SETUP_TEST_TOKEN = 'real-token-xyz';
    process.env.SETUP_TEST_REGION = 'eu-west-3';
    envInitCalls.length = 0;

    mockLoad({
      config: { platform: 'server' },
      destinations: {
        d: {
          package: '@walkeros/__test-env-marker-destination',
          config: {
            settings: {
              token: '__WALKEROS_ENV:SETUP_TEST_TOKEN',
              region: '__WALKEROS_ENV:SETUP_TEST_REGION:fallback',
              missing: '__WALKEROS_ENV:NOT_SET:default-value',
              static: 'plain-string',
            },
            setup: true,
          },
        },
      },
    });

    try {
      await setupCommand({ target: 'destination.d', logger });
    } finally {
      delete process.env.SETUP_TEST_TOKEN;
      delete process.env.SETUP_TEST_REGION;
    }

    expect(envInitCalls).toHaveLength(1);
    const seenConfig = envInitCalls[0].config as {
      settings: Record<string, unknown>;
    };
    expect(seenConfig.settings.token).toBe('real-token-xyz');
    expect(seenConfig.settings.region).toBe('eu-west-3');
    expect(seenConfig.settings.missing).toBe('default-value');
    expect(seenConfig.settings.static).toBe('plain-string');
  });
});
