import type { Flow, Logger } from '@walkeros/core';
import { setupCommand } from '../index';
import { loadFlowConfig } from '../../../config/loader.js';
import { createMockLogger } from '../../../__tests__/helpers/mock-logger.js';
import { writeResult } from '../../../core/output.js';

jest.mock('../../../config/loader.js');
jest.mock('../../../core/output.js', () => {
  const actual = jest.requireActual('../../../core/output.js');
  return { ...actual, writeResult: jest.fn().mockResolvedValue(undefined) };
});

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
const mockedWriteResult = writeResult as jest.MockedFunction<
  typeof writeResult
>;

/** Pull the rendered string off a logger.info mock call. */
function infoMessages(logger: Logger.Instance): string[] {
  const fn = logger.info as jest.Mock;
  return fn.mock.calls.map((args: unknown[]) => args[0] as string);
}

describe('setupCommand', () => {
  let logger: Logger.Instance;

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
    mockedWriteResult.mockClear();
    logger = createMockLogger();
  });

  afterEach(() => {
    mockedLoadFlowConfig.mockReset();
  });

  test('invokes setup with component context and narrates start/ok', async () => {
    await setupCommand({ target: 'destination.fake', logger });

    // Setup function received the resolved component context.
    expect(setupCalls).toHaveLength(1);
    expect(setupCalls[0]).toEqual({
      id: 'fake',
      config: { settings: { x: 1 }, setup: true },
      env: {},
      logger: expect.any(Object),
    });

    // Narration goes through the logger, not console.log.
    expect(infoMessages(logger)).toEqual([
      'setup: starting destination.fake',
      'setup: ok destination.fake',
    ]);

    // No JSON envelope written in human mode.
    expect(mockedWriteResult).not.toHaveBeenCalled();
  });

  test.each([
    {
      name: 'no setup function',
      target: 'destination.bare',
      expected: 'setup: skipped destination.bare (no setup function)',
    },
    {
      name: 'config.setup is false',
      target: 'destination.disabled',
      expected: 'setup: skipped destination.disabled (config.setup is false)',
    },
    {
      name: 'config.setup is unset',
      target: 'destination.unset',
      expected: 'setup: skipped destination.unset (config.setup is unset)',
    },
  ])('skips with narration when $name', async ({ target, expected }) => {
    await setupCommand({ target, logger });
    expect(setupCalls).toHaveLength(0);
    expect(infoMessages(logger)).toEqual([
      `setup: starting ${target}`,
      expected,
    ]);
  });

  test.each([
    {
      name: 'unknown component',
      target: 'destination.missing',
      pattern: /not found/,
    },
    {
      name: 'package without default export',
      target: 'destination.naked',
      pattern: /no default export/,
    },
  ])('throws on $name', async ({ target, pattern }) => {
    await expect(setupCommand({ target, logger })).rejects.toThrow(pattern);
  });

  test('emits standard JSON envelope when --json is set', async () => {
    await setupCommand({ target: 'destination.fake', json: true, logger });

    // No human narration in JSON mode (logger info is silenced by createCLILogger
    // in --json, but here we inject our own logger so we just assert writeResult
    // received the envelope and the setupFn was actually invoked).
    expect(setupCalls).toHaveLength(1);
    expect(mockedWriteResult).toHaveBeenCalledTimes(1);
    const [payload] = mockedWriteResult.mock.calls[0];
    const parsed = JSON.parse(String(payload));
    // `duration` is omitted when 0 (per createJsonOutput), so we only assert
    // the success/data envelope here. The setup result lives under `data.result`.
    expect(parsed).toMatchObject({
      success: true,
      data: { result: { datasetCreated: true, tableCreated: false } },
    });
  });
});
