import type { Flow } from '@walkeros/core';
import { setupCommand } from '../index';
import { loadFlowConfig } from '../../../config/loader.js';

jest.mock('../../../config/loader.js');

const setupCalls: unknown[] = [];

// `__esModule: true` is required: dynamic `import()` on a CJS module wraps the
// whole module in `.default`. Marking ESM lets jest expose our `default` field
// as the resolved module's `default` directly, mirroring real packages compiled
// from `export default ...`.
jest.mock(
  '@walkeros/__test-fake-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'fake',
      push: () => {},
      setup: async (ctx: unknown) => {
        setupCalls.push(ctx);
        return { datasetCreated: true, tableCreated: false };
      },
    },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-no-setup-destination',
  () => ({
    __esModule: true,
    default: { type: 'no-setup', push: () => {} },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-void-setup-destination',
  () => ({
    __esModule: true,
    default: {
      type: 'void',
      push: () => {},
      setup: async () => undefined,
    },
  }),
  { virtual: true },
);

jest.mock(
  '@walkeros/__test-no-default-export',
  () => ({
    __esModule: true,
    Named: { type: 'noop', push: () => {} },
  }),
  { virtual: true },
);

const baseFlowSettings: Flow = {
  config: { platform: 'server' },
  destinations: {
    fake: {
      package: '@walkeros/__test-fake-destination',
      config: { settings: { x: 1 }, setup: true },
    },
    bare: {
      package: '@walkeros/__test-no-setup-destination',
      config: { setup: true },
    },
    voiding: {
      package: '@walkeros/__test-void-setup-destination',
      config: { setup: true },
    },
    disabled: {
      package: '@walkeros/__test-fake-destination',
      config: { setup: false },
    },
    unset: {
      package: '@walkeros/__test-fake-destination',
      config: { settings: { x: 1 } },
    },
    naked: {
      package: '@walkeros/__test-no-default-export',
      config: { setup: true },
    },
  },
};

const mockedLoadFlowConfig = jest.mocked(loadFlowConfig);

describe('setupCommand', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    setupCalls.length = 0;
    mockedLoadFlowConfig.mockResolvedValue({
      flowSettings: baseFlowSettings,
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
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    mockedLoadFlowConfig.mockReset();
  });

  test('invokes setup and emits structured stdout when result returned', async () => {
    await setupCommand({ target: 'destination.fake' });
    expect(setupCalls).toHaveLength(1);
    const lines = logSpy.mock.calls.map((c) => c[0]);
    expect(lines[0]).toBe('setup: starting destination.fake');
    expect(lines).toContain(
      JSON.stringify({ datasetCreated: true, tableCreated: false }),
    );
    expect(lines[lines.length - 1]).toBe('setup: ok destination.fake');
  });

  test('parses <kind>.<name> target syntax via integration path', async () => {
    await setupCommand({ target: 'destination.fake' });
    expect(setupCalls).toHaveLength(1);
    const ctx = setupCalls[0];
    expect(ctx).toMatchObject({
      id: 'fake',
      config: { settings: { x: 1 }, setup: true },
      env: {},
    });
  });

  test('skips with narration when package has no setup function', async () => {
    await expect(setupCommand({ target: 'destination.bare' })).resolves.toBe(
      undefined,
    );
    const lines = logSpy.mock.calls.map((c) => c[0]);
    expect(lines).toEqual([
      'setup: starting destination.bare',
      'setup: skipped destination.bare (no setup function)',
    ]);
  });

  test('skips with narration when config.setup is false', async () => {
    await setupCommand({ target: 'destination.disabled' });
    const lines = logSpy.mock.calls.map((c) => c[0]);
    expect(lines).toEqual([
      'setup: starting destination.disabled',
      'setup: skipped destination.disabled (config.setup is false)',
    ]);
    expect(setupCalls).toHaveLength(0);
  });

  test('skips with narration when config.setup is unset', async () => {
    await setupCommand({ target: 'destination.unset' });
    const lines = logSpy.mock.calls.map((c) => c[0]);
    expect(lines).toEqual([
      'setup: starting destination.unset',
      'setup: skipped destination.unset (config.setup is unset)',
    ]);
    expect(setupCalls).toHaveLength(0);
  });

  test('emits no JSON line when setup returns undefined', async () => {
    await setupCommand({ target: 'destination.voiding' });
    const lines = logSpy.mock.calls.map((c) => c[0]);
    expect(lines).toEqual([
      'setup: starting destination.voiding',
      'setup: ok destination.voiding',
    ]);
  });

  test('throws on unknown component', async () => {
    await expect(
      setupCommand({ target: 'destination.missing' }),
    ).rejects.toThrow(/not found/);
  });

  test('throws when package has no default export', async () => {
    await expect(setupCommand({ target: 'destination.naked' })).rejects.toThrow(
      /no default export/,
    );
  });
});
