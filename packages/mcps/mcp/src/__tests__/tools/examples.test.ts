import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as Core from '@walkeros/core';
import { createLocalRuntime } from '../../runtime/local.js';
import { HINT_OUT_OF_PROCESS } from '../../runtime/types.js';
import {
  MAX_PACKAGE_LOOKUPS,
  createFlowExamplesToolSpec,
} from '../../tools/examples.js';
import { ExamplesListOutputShape } from '../../schemas/output.js';
import type { ToolSpec } from '../../tool-spec.js';
import {
  structured,
  record,
  rows,
  hintsOf,
  textOf,
  str,
} from '../support/tool-result.js';

// The real resolver and selector come from their cli source modules: the
// cli index would pull the whole cli into this mock, and the tool must use
// the same selection rule simulate uses.
jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
  resolveExportName: jest.requireActual(
    '../../../../../cli/src/core/resolve-export-name',
  ).resolveExportName,
  selectDevExamples: jest.requireActual(
    '../../../../../cli/src/commands/push/dev-examples',
  ).selectDevExamples,
}));

// The step package resolver and reader need core's real helpers; only the
// network read is mocked.
jest.mock('@walkeros/core', () => ({
  ...jest.requireActual<typeof Core>('@walkeros/core'),
  fetchPackage: jest.fn(),
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true,
  })),
}));

import { loadJsonConfig } from '@walkeros/cli';
import { fetchPackage } from '@walkeros/core';
const mockLoadJsonConfig = jest.mocked(loadJsonConfig);
const mockFetchPackage = jest.mocked(fetchPackage);

function parse(text: string): unknown {
  return JSON.parse(text);
}

/** The listed examples of a result, narrowed. */
function examplesOf(result: unknown): Record<string, unknown>[] {
  return rows(structured(result).examples);
}

/** The warnings of a result, narrowed; none when it has no warnings. */
function warningsOf(result: unknown): string[] {
  const warnings = record(structured(result)._hints).warnings;
  if (warnings === undefined) return [];
  if (!Array.isArray(warnings))
    throw new Error(`Not an array: ${JSON.stringify(warnings)}`);
  return warnings.map(str);
}

/** The listed example with this name, or a failure naming what was listed. */
function exampleNamed(result: unknown, name: string): Record<string, unknown> {
  const example = examplesOf(result).find((e) => e.exampleName === name);
  if (!example)
    throw new Error(`No example ${name}: ${JSON.stringify(result)}`);
  return example;
}

const sampleConfig = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web' },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          examples: {
            basic: {
              in: '<div data-elb="page">Home</div>',
              trigger: { type: 'load' },
            },
          },
        },
      },
      destinations: {
        gtag: {
          package: '@walkeros/web-destination-gtag',
          examples: {
            purchase: {
              in: { name: 'order complete', data: { value: 42 } },
              mapping: {
                name: 'purchase',
                data: { map: { value: 'data.value' } },
              },
              out: [
                { type: 'call', path: 'gtag', args: ['event', 'purchase'] },
              ],
            },
            pageview: {
              in: { name: 'page view' },
              out: [
                { type: 'call', path: 'gtag', args: ['event', 'page_view'] },
              ],
            },
          },
        },
      },
      transformers: {
        enrich: {
          package: '@walkeros/transformer-enrich',
          examples: {
            enrich_order: {
              in: { name: 'order complete' },
              out: { name: 'order complete', data: { enriched: true } },
            },
          },
        },
      },
    },
  },
};

describe('flow_examples tool', () => {
  let tool: ToolSpec;

  beforeEach(() => {
    tool = createFlowExamplesToolSpec(createLocalRuntime());
    mockLoadJsonConfig.mockReset();
    mockFetchPackage.mockReset();
  });

  it('registers with correct name, title, and annotations', () => {
    expect(tool.name).toBe('flow_examples');
    expect(tool.title).toBe('Flow Examples');
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    expect(createFlowExamplesToolSpec(createLocalRuntime()).outputSchema).toBe(
      ExamplesListOutputShape,
    );
  });

  it('returns all examples from a single-flow config', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(record(result).isError).toBeUndefined();
    expect(structured(result).flow).toBe('default');
    expect(structured(result).count).toBe(4);
    expect(examplesOf(result)).toHaveLength(4);
  });

  it('filters by step', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({
      configPath: './flow.json',
      step: 'destination.gtag',
    });

    expect(structured(result).count).toBe(2);
    expect(examplesOf(result).every((e) => e.step === 'destination.gtag')).toBe(
      true,
    );
  });

  it('excludes in/out/mapping by default (metadata only)', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({ configPath: './flow.json' });

    const purchase = exampleNamed(result, 'purchase');
    expect(purchase.hasMapping).toBe(true);
    expect(purchase.hasIn).toBe(true);
    expect(purchase.hasOut).toBe(true);
    expect(purchase.mapping).toBeUndefined();
    expect(purchase.in).toBeUndefined();
    expect(purchase.out).toBeUndefined();
  });

  it('includes in/out/mapping when full: true', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({
      configPath: './flow.json',
      full: true,
    });

    const purchase = exampleNamed(result, 'purchase');
    expect(purchase.mapping).toEqual({
      name: 'purchase',
      data: { map: { value: 'data.value' } },
    });
  });

  it('errors on multi-flow without flow param', async () => {
    const multiFlowConfig = {
      version: 4,
      flows: {
        production: { config: { platform: 'web' } },
        staging: { config: { platform: 'web' } },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(multiFlowConfig);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(record(result).isError).toBe(true);
    const parsed = record(parse(textOf(result)));
    expect(parsed.error).toContain('Multiple flows found');
  });

  it('errors on config load failure', async () => {
    mockLoadJsonConfig.mockRejectedValue(new Error('File not found'));
    const result = await tool.handler({ configPath: './missing.json' });

    expect(record(result).isError).toBe(true);
    const parsed = record(parse(textOf(result)));
    expect(parsed.error).toBe('File not found');
  });

  it('includes trigger metadata when full: true', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({
      configPath: './flow.json',
      full: true,
    });

    const browser = exampleNamed(result, 'basic');
    expect(browser.hasTrigger).toBe(true);
    expect(browser.trigger).toEqual({ type: 'load' });
  });

  it('excludes examples with public: false by default', async () => {
    const configWithHidden = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                visible: { in: { name: 'page view' } },
                hidden: { in: { name: 'debug event' }, public: false },
              },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configWithHidden);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(structured(result).count).toBe(1);
    expect(examplesOf(result)[0].exampleName).toBe('visible');
  });

  it('includes public: false examples when includeHidden: true', async () => {
    const configWithHidden = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                visible: { in: { name: 'page view' } },
                hidden: { in: { name: 'debug event' }, public: false },
              },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configWithHidden);
    const result = await tool.handler({
      configPath: './flow.json',
      includeHidden: true,
    });

    expect(structured(result).count).toBe(2);
    const names = examplesOf(result).map((e) => e.exampleName);
    expect(names).toContain('visible');
    expect(names).toContain('hidden');
    const hidden = exampleNamed(result, 'hidden');
    expect(hidden.public).toBe(false);
  });

  it('surfaces title and description on output items when set', async () => {
    const configWithMetadata = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                purchase: {
                  title: 'Purchase Event',
                  description: 'Fires when an order is completed',
                  in: { name: 'order complete' },
                },
              },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configWithMetadata);
    const result = await tool.handler({ configPath: './flow.json' });

    const purchase = exampleNamed(result, 'purchase');
    expect(purchase.title).toBe('Purchase Event');
    expect(purchase.description).toBe('Fires when an order is completed');
  });

  it('returns empty examples array when no examples exist', async () => {
    const configNoExamples = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            gtag: { package: '@walkeros/web-destination-gtag' },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configNoExamples);
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/web-destination-gtag',
      version: '1.0.0',
      type: 'destination',
      schemas: {},
      examples: {},
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({ configPath: './flow.json' });

    expect(structured(result).count).toBe(0);
    expect(examplesOf(result)).toEqual([]);
  });

  it('tags inline examples with source: "inline"', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(examplesOf(result).every((e) => e.source === 'inline')).toBe(true);
  });

  it('reports package examples that fail the step example schema', async () => {
    mockLoadJsonConfig.mockResolvedValue({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          transformers: { ga4: { package: '@walkeros/transformer-ga4' } },
        },
      },
    });
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/transformer-ga4',
      version: '1.0.0',
      type: 'transformer',
      schemas: {},
      examples: {
        step: {
          purchase: { in: {}, out: [['return', {}]] },
          broken: { title: 7, in: {} },
        },
      },
      hintKeys: [],
      exampleSummaries: [],
    });

    const result = await tool.handler({ configPath: './flow.json' });

    expect(structured(result).count).toBe(1);
    expect(record(structured(result)._hints).warnings).toEqual([
      'Skipped 1 package example(s) that do not match the step example schema: transformer.ga4.broken.',
    ]);
  });

  it('falls back to package-shipped examples when a step has no inline examples', async () => {
    const configNoInline = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          transformers: {
            ga4: { package: '@walkeros/transformer-ga4' },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configNoInline);
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/transformer-ga4',
      version: '1.0.0',
      type: 'transformer',
      schemas: {},
      examples: {
        step: {
          addToCart: {
            title: 'Add to cart',
            in: { url: 'https://example.com/g/collect?en=add_to_cart' },
            out: [['return', { name: 'product add' }]],
          },
          purchase: {
            in: { url: 'https://example.com/g/collect?en=purchase' },
            out: [['return', { name: 'order complete' }]],
          },
        },
      },
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({ configPath: './flow.json' });

    expect(record(result).isError).toBeUndefined();
    expect(structured(result).count).toBe(2);
    expect(examplesOf(result).every((e) => e.source === 'package')).toBe(true);
    const names = examplesOf(result).map((e) => e.exampleName);
    expect(names).toContain('addToCart');
    expect(names).toContain('purchase');
    expect(mockFetchPackage).toHaveBeenCalledWith(
      '@walkeros/transformer-ga4',
      expect.any(Object),
    );
  });

  it.each<[string, string, Record<string, string> | undefined]>([
    ['a bundle pin', '@walkeros/transformer-ga4', { version: '1.0.0' }],
    ['an inline version', '@walkeros/transformer-ga4@1.0.0', undefined],
    [
      'a bundle pin over a disagreeing inline version',
      '@walkeros/transformer-ga4@2.0.0',
      { version: '1.0.0' },
    ],
  ])(
    'reads package examples at the version %s names',
    async (_case, stepPackage, pin) => {
      mockLoadJsonConfig.mockResolvedValue({
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'server',
              ...(pin
                ? { bundle: { packages: { '@walkeros/transformer-ga4': pin } } }
                : {}),
            },
            transformers: { ga4: { package: stepPackage } },
          },
        },
      });
      mockFetchPackage.mockResolvedValue({
        packageName: '@walkeros/transformer-ga4',
        version: '1.0.0',
        type: 'transformer',
        schemas: {},
        examples: {
          step: {
            purchase: { in: { name: 'order complete' } },
            addToCart: { in: { name: 'product add' } },
          },
        },
        hintKeys: [],
        exampleSummaries: [],
      });
      const result = await tool.handler({ configPath: './flow.json' });

      expect(mockFetchPackage).toHaveBeenCalledWith(
        '@walkeros/transformer-ga4',
        { version: '1.0.0', client: expect.any(String) },
      );
      expect(examplesOf(result).map((example) => example.version)).toEqual([
        '1.0.0',
        '1.0.0',
      ]);
    },
  );

  describe('multi-export packages', () => {
    const bigqueryExamples = {
      step: { row: { in: { name: 'page view' }, out: [] } },
    };
    const pubsubExamples = {
      step: { publish: { in: { name: 'page view' }, out: [] } },
    };

    function configWith(
      destination: Record<string, unknown>,
      bundle?: Record<string, unknown>,
    ) {
      return {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server', ...(bundle ? { bundle } : {}) },
            destinations: { out: destination },
          },
        },
      };
    }

    beforeEach(() => {
      mockFetchPackage.mockResolvedValue({
        packageName: '@walkeros/server-destination-gcp',
        version: '1.0.0',
        type: 'destination',
        schemas: {},
        examples: bigqueryExamples,
        exportExamples: {
          destinationBigQuery: bigqueryExamples,
          destinationPubSub: pubsubExamples,
        },
        hintKeys: [],
        exampleSummaries: [],
      });
    });

    it.each([
      ['the step import', { import: 'destinationPubSub' }, ['publish']],
      ['the default export', {}, ['row']],
      ['an export missing from the map', { import: 'destinationTypo' }, []],
    ])('lists the examples of %s', async (_label, stepFields, expected) => {
      mockLoadJsonConfig.mockResolvedValue(
        configWith({
          package: '@walkeros/server-destination-gcp',
          ...stepFields,
        }),
      );
      const result = await tool.handler({ configPath: './flow.json' });
      const names = examplesOf(result).map((e) => e.exampleName);
      expect(names).toEqual(expected);
    });

    it.each([
      '@walkeros/server-destination-gcp',
      '@walkeros/server-destination-gcp@1.0.0',
    ])(
      'follows bundle.packages imports when the step (%s) has no import',
      async (stepPackage) => {
        const config = configWith(
          { package: stepPackage },
          {
            packages: {
              '@walkeros/server-destination-gcp': {
                imports: ['destinationPubSub'],
              },
            },
          },
        );
        mockLoadJsonConfig.mockResolvedValue(config);
        const result = await tool.handler({ configPath: './flow.json' });
        expect(examplesOf(result).map((e) => e.exampleName)).toEqual([
          'publish',
        ]);
      },
    );
  });

  it('prefers inline examples over package examples (no fallback, no duplicates)', async () => {
    const configInline = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          transformers: {
            ga4: {
              package: '@walkeros/transformer-ga4',
              examples: {
                custom: { in: { name: 'custom event' } },
              },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configInline);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(structured(result).count).toBe(1);
    expect(examplesOf(result)[0].exampleName).toBe('custom');
    expect(examplesOf(result)[0].source).toBe('inline');
    expect(mockFetchPackage).not.toHaveBeenCalled();
  });

  it('yields nothing for a step ref with no package and no inline examples', async () => {
    const configNoPackage = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            custom: {},
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configNoPackage);
    const result = await tool.handler({ configPath: './flow.json' });

    expect(structured(result).count).toBe(0);
    expect(mockFetchPackage).not.toHaveBeenCalled();
  });

  it('does not crash when a package fetch fails; returns inline from other steps', async () => {
    const configMixed = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                inlineOne: { in: { name: 'page view' } },
              },
            },
            broken: { package: '@walkeros/web-destination-broken' },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configMixed);
    mockFetchPackage.mockRejectedValue(new Error('HTTP 404'));
    const result = await tool.handler({ configPath: './flow.json' });

    expect(record(result).isError).toBeUndefined();
    expect(structured(result).count).toBe(1);
    expect(examplesOf(result)[0].exampleName).toBe('inlineOne');
    expect(examplesOf(result)[0].source).toBe('inline');
    expect(
      warningsOf(result).filter((warning) =>
        warning.includes('destination.broken'),
      ),
    ).toEqual([expect.stringContaining('HTTP 404')]);
  });

  it('reports steps naming one package at two inline versions instead of reading either', async () => {
    mockLoadJsonConfig.mockResolvedValue({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            first: { package: '@walkeros/web-destination-gtag@1.0.0' },
            second: { package: '@walkeros/web-destination-gtag@2.0.0' },
          },
        },
      },
    });
    const result = await tool.handler({ configPath: './flow.json' });

    expect(record(result).isError).toBeUndefined();
    expect(mockFetchPackage).not.toHaveBeenCalled();
    const conflicts = warningsOf(result).filter((warning) =>
      warning.includes('Conflicting inline versions'),
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain('destination.first');
    expect(conflicts[0]).toContain('destination.second');
  });

  describe('local path packages', () => {
    let dir: string;
    let packageDir: string;

    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-examples-local-'));
      packageDir = path.join(dir, 'local-pkg');
      fs.mkdirSync(path.join(packageDir, 'dist'), { recursive: true });
      fs.writeFileSync(
        path.join(packageDir, 'package.json'),
        JSON.stringify({ name: 'local-pkg', version: '0.1.0' }),
      );
      fs.writeFileSync(
        path.join(packageDir, 'dist', 'walkerOS.json'),
        JSON.stringify({
          $meta: { type: 'destination', platform: 'web' },
          schemas: {},
          examples: { step: { localOne: { in: { name: 'page view' } } } },
        }),
      );
    });

    afterAll(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    function localConfig(stepPackage: string) {
      return {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: { local: { package: stepPackage } },
          },
        },
      };
    }

    it('reads the examples of a local path package from disk, with its version', async () => {
      const config = localConfig('./local-pkg');
      const local = createFlowExamplesToolSpec({
        load: async () => config,
        baseDir: () => dir,
      });
      const result = await local.handler({ configPath: './flow.json' });

      expect(examplesOf(result)).toEqual([
        expect.objectContaining({
          step: 'destination.local',
          exampleName: 'localOne',
          source: 'package',
          version: '0.1.0',
        }),
      ]);
      expect(mockFetchPackage).not.toHaveBeenCalled();
    });

    it('reads nothing on a runtime without a directory and says so', async () => {
      const config = localConfig(packageDir);
      const loadOnly = createFlowExamplesToolSpec({ load: async () => config });
      const result = await loadOnly.handler({
        configPath: JSON.stringify(config),
      });

      expect(record(result).isError).toBeUndefined();
      expect(examplesOf(result)).toEqual([]);
      const unreadable = warningsOf(result).filter((warning) =>
        warning.includes(`destination.local (${packageDir})`),
      );
      expect(unreadable).toEqual([
        expect.stringContaining('no directory to read it from'),
      ]);
      expect(mockFetchPackage).not.toHaveBeenCalled();
    });
  });

  it('looks up a package shared by several steps once', async () => {
    mockLoadJsonConfig.mockResolvedValue({
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          transformers: {
            first: { package: '@walkeros/transformer-ga4' },
            second: { package: '@walkeros/transformer-ga4' },
          },
        },
      },
    });
    mockFetchPackage.mockResolvedValue({
      packageName: '@walkeros/transformer-ga4',
      version: '1.0.0',
      type: 'transformer',
      schemas: {},
      examples: { step: { purchase: { in: { name: 'order complete' } } } },
      hintKeys: [],
      exampleSummaries: [],
    });
    const result = await tool.handler({ configPath: './flow.json' });

    expect(mockFetchPackage).toHaveBeenCalledTimes(1);
    expect(structured(result).count).toBe(2);
  });

  it('caps package lookups per request and warns about skipped packages', async () => {
    const destinations = Object.fromEntries(
      Array.from({ length: MAX_PACKAGE_LOOKUPS + 5 }, (_, i) => [
        `step${i}`,
        { package: `@walkeros/web-destination-pkg${i}` },
      ]),
    );
    mockLoadJsonConfig.mockResolvedValue({
      version: 4,
      flows: { default: { config: { platform: 'web' }, destinations } },
    });
    mockFetchPackage.mockRejectedValue(new Error('HTTP 404'));
    const result = await tool.handler({ configPath: './flow.json' });

    expect(mockFetchPackage).toHaveBeenCalledTimes(MAX_PACKAGE_LOOKUPS);
    expect(JSON.stringify(record(structured(result)._hints).warnings)).toMatch(
      new RegExp(`first ${MAX_PACKAGE_LOOKUPS} packages`),
    );
  });

  it('suggests flow_simulate only when the runtime can simulate', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig);
    const local = createLocalRuntime();
    const readOnly = createFlowExamplesToolSpec({
      load: (input) => local.load(input),
    });

    const withSimulate = await tool.handler({ configPath: './flow.json' });
    const withoutSimulate = await readOnly.handler({
      configPath: './flow.json',
    });

    expect(hintsOf(withSimulate)).toEqual([
      'Use flow_simulate with step and event to simulate',
    ]);
    expect(hintsOf(withoutSimulate)).toEqual([HINT_OUT_OF_PROCESS]);
  });
});
