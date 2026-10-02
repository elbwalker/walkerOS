import { createLocalRuntime } from '../../runtime/local.js';
import { HINT_OUT_OF_PROCESS } from '../../runtime/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  MAX_PACKAGE_LOOKUPS,
  createFlowExamplesToolSpec,
  registerFlowExamplesTool,
} from '../../tools/examples.js';
import { ExamplesListOutputShape } from '../../schemas/output.js';
import type { ToolSpec } from '../../tool-spec.js';
import {
  structured,
  record,
  rows,
  hintsOf,
  textOf,
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

jest.mock('@walkeros/core', () => ({
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

/** The config the first `registerTool` call passed, narrowed. */
function firstRegisteredConfig(
  calls: readonly unknown[],
): Record<string, unknown> {
  const first = calls[0];
  if (!Array.isArray(first)) throw new Error('No tool was registered');
  return record(first[1]);
}

function parse(text: string): unknown {
  return JSON.parse(text);
}

/** The listed examples of a result, narrowed. */
function examplesOf(result: unknown): Record<string, unknown>[] {
  return rows(structured(result).examples);
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
              in: { name: 'order complete', data: { total: 42 } },
              mapping: {
                name: 'purchase',
                data: { map: { value: 'data.total' } },
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
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const registerTool = jest.spyOn(server, 'registerTool');
    registerFlowExamplesTool(server, createLocalRuntime());
    expect(firstRegisteredConfig(registerTool.mock.calls).outputSchema).toBe(
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
      data: { map: { value: 'data.total' } },
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

    it('follows bundle.packages imports when the step has no import', async () => {
      const config = configWith(
        { package: '@walkeros/server-destination-gcp' },
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
      expect(examplesOf(result).map((e) => e.exampleName)).toEqual(['publish']);
    });
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
