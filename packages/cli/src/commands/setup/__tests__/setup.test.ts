import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { Flow, Logger } from '@walkeros/core';
import { setupCommand } from '../index';
import { loadFlowConfig } from '../../../config/loader.js';
import { loadStepPackage } from '../../../core/step-loader.js';
import { createMockLogger } from '../../../__tests__/helpers/mock-logger.js';
import { writeResult } from '../../../core/output.js';

jest.mock('../../../config/loader.js');
jest.mock('../../../core/output.js', () => {
  const actual = jest.requireActual('../../../core/output.js');
  return { ...actual, writeResult: jest.fn().mockResolvedValue(undefined) };
});
jest.mock('../../../core/step-loader.js', () => ({
  loadStepPackage: jest.fn(),
}));

const mockedLoadStep = jest.mocked(loadStepPackage);

const setupCalls: unknown[] = [];

// Package fixtures: plain module namespaces the mocked step loader resolves
// to, mirroring what a real dynamic import of the extracted entry returns.
const fakeDestinationModule: Record<string, unknown> = {
  default: {
    type: 'fake',
    push: () => {},
    setup: async (ctx: unknown) => {
      setupCalls.push(ctx);
      return { datasetCreated: true, tableCreated: false };
    },
  },
};

const noSetupDestinationModule: Record<string, unknown> = {
  default: { type: 'no-setup', push: () => {} },
};

const noDefaultExportModule: Record<string, unknown> = {
  Named: { type: 'noop', push: () => {} },
};

// Multi-export package fixture used to exercise the export-name resolver.
// Default export simulates the package's "primary" component (componentA);
// componentB is only reachable via the explicit `import` field or via
// bundle.packages.imports[0].
const multiExportSetupCalls: { name: string; ctx: unknown }[] = [];

const multiExportModule: Record<string, unknown> = {
  componentA: {
    type: 'a',
    push: () => {},
    setup: async (ctx: unknown) => {
      multiExportSetupCalls.push({ name: 'componentA', ctx });
      return { ran: 'A' };
    },
  },
  componentB: {
    type: 'b',
    push: () => {},
    setup: async (ctx: unknown) => {
      multiExportSetupCalls.push({ name: 'componentB', ctx });
      return { ran: 'B' };
    },
  },
  default: {
    type: 'a',
    push: () => {},
    setup: async (ctx: unknown) => {
      multiExportSetupCalls.push({ name: 'default', ctx });
      return { ran: 'default' };
    },
  },
};

const moduleFixtures: Record<string, Record<string, unknown>> = {
  '@walkeros/__test-fake-destination': fakeDestinationModule,
  '@walkeros/__test-no-setup-destination': noSetupDestinationModule,
  '@walkeros/__test-no-default-export': noDefaultExportModule,
  '@walkeros/__test-multi-export': multiExportModule,
};

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

/** Pull the rendered string off a logger.info mock call. */
function infoMessages(logger: Logger.Instance): string[] {
  const fn = logger.info as jest.Mock;
  return fn.mock.calls.map((args: unknown[]) => args[0] as string);
}

describe('setupCommand', () => {
  let logger: Logger.Instance;
  let installDir: string;

  beforeEach(async () => {
    setupCalls.length = 0;
    mockLoad(baseFlowSettings);
    mockedWriteResult.mockClear();
    logger = createMockLogger();
    // Real temp dir so the cleanup-in-finally behavior is observable.
    installDir = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-install-'));
    mockedLoadStep.mockImplementation(async (flow, _kind, id) => {
      const pkg = flow.destinations?.[id]?.package;
      const module = pkg !== undefined ? moduleFixtures[pkg] : undefined;
      if (pkg === undefined || module === undefined) {
        throw new Error(`no module fixture for package "${String(pkg)}"`);
      }
      return {
        module,
        packageName: pkg,
        normalizedFlow: flow,
        packageDir: path.join(installDir, 'node_modules', pkg),
        installDir,
      };
    });
  });

  afterEach(async () => {
    mockedLoadFlowConfig.mockReset();
    mockedLoadStep.mockReset();
    await fs.remove(installDir);
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

  test('loads the package through the shared step loader', async () => {
    await setupCommand({ target: 'destination.fake', logger });
    expect(mockedLoadStep).toHaveBeenCalledTimes(1);
    expect(mockedLoadStep).toHaveBeenCalledWith(
      baseFlowSettings,
      'destination',
      'fake',
      expect.objectContaining({ logger: expect.anything() }),
    );
  });

  test('removes the temp install tree after the lifecycle completes', async () => {
    await setupCommand({ target: 'destination.fake', logger });
    expect(await fs.pathExists(installDir)).toBe(false);
  });

  test('removes the temp install tree on skip paths too', async () => {
    await setupCommand({ target: 'destination.unset', logger });
    expect(setupCalls).toHaveLength(0);
    expect(await fs.pathExists(installDir)).toBe(false);
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

  describe('multi-export packages (Bug F)', () => {
    beforeEach(() => {
      multiExportSetupCalls.length = 0;
    });

    test('routes to componentA when destinations.X.import = "componentA"', async () => {
      mockLoad({
        config: { platform: 'server' },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            import: 'componentA',
            config: { setup: true },
          },
        },
      });

      await setupCommand({ target: 'destination.x', logger });

      expect(multiExportSetupCalls).toHaveLength(1);
      expect(multiExportSetupCalls[0].name).toBe('componentA');
    });

    test('routes to componentB via explicit import field', async () => {
      mockLoad({
        config: { platform: 'server' },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            import: 'componentB',
            config: { setup: true },
          },
        },
      });

      await setupCommand({ target: 'destination.x', logger });

      expect(multiExportSetupCalls).toHaveLength(1);
      expect(multiExportSetupCalls[0].name).toBe('componentB');
    });

    test('routes to componentB via bundle.packages.imports[0] when import is unset', async () => {
      mockLoad({
        config: {
          platform: 'server',
          bundle: {
            packages: {
              '@walkeros/__test-multi-export': {
                imports: ['componentB'],
              },
            },
          },
        },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            config: { setup: true },
          },
        },
      });

      await setupCommand({ target: 'destination.x', logger });

      expect(multiExportSetupCalls).toHaveLength(1);
      expect(multiExportSetupCalls[0].name).toBe('componentB');
    });

    test('resolves the export name against the loader-normalized flow', async () => {
      // The RAW flow carries no imports hint; only the normalizedFlow the
      // loader returns does. componentB running proves the command resolves
      // the export name against the loader's normalized flow, not the raw
      // flowSettings (inline-versioned steps only match after normalization).
      const rawFlow: Flow = {
        config: { platform: 'server' },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            config: { setup: true },
          },
        },
      };
      const normalizedFlow: Flow = {
        config: {
          platform: 'server',
          bundle: {
            packages: {
              '@walkeros/__test-multi-export': { imports: ['componentB'] },
            },
          },
        },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            config: { setup: true },
          },
        },
      };
      mockLoad(rawFlow);
      mockedLoadStep.mockResolvedValue({
        module: multiExportModule,
        packageName: '@walkeros/__test-multi-export',
        normalizedFlow,
        packageDir: path.join(installDir, 'node_modules', 'multi'),
        installDir,
      });

      await setupCommand({ target: 'destination.x', logger });

      expect(multiExportSetupCalls).toHaveLength(1);
      expect(multiExportSetupCalls[0].name).toBe('componentB');
    });

    test('falls back to default export when neither code nor imports set (back-compat)', async () => {
      mockLoad({
        config: { platform: 'server' },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            config: { setup: true },
          },
        },
      });

      await setupCommand({ target: 'destination.x', logger });

      expect(multiExportSetupCalls).toHaveLength(1);
      expect(multiExportSetupCalls[0].name).toBe('default');
    });

    test('throws actionable error when explicit import names a missing export', async () => {
      mockLoad({
        config: { platform: 'server' },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            import: 'componentZ',
            config: { setup: true },
          },
        },
      });

      await expect(
        setupCommand({ target: 'destination.x', logger }),
      ).rejects.toThrow(/no export "componentZ"/);
    });

    test('throws actionable error when imports[0] names a missing export', async () => {
      mockLoad({
        config: {
          platform: 'server',
          bundle: {
            packages: {
              '@walkeros/__test-multi-export': {
                imports: ['componentZ'],
              },
            },
          },
        },
        destinations: {
          x: {
            package: '@walkeros/__test-multi-export',
            config: { setup: true },
          },
        },
      });

      await expect(
        setupCommand({ target: 'destination.x', logger }),
      ).rejects.toThrow(/no export "componentZ".*imports\[0\]/s);
    });
  });
});
