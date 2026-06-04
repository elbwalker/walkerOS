import { registerFlowExamplesTool } from '../../tools/examples.js';
import { ExamplesListOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
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

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
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
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerFlowExamplesTool(server as any);
    mockLoadJsonConfig.mockReset();
    mockFetchPackage.mockReset();
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('flow_examples');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('Flow Examples');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('flow_examples');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(ExamplesListOutputShape);
  });

  it('returns all examples from a single-flow config', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.flow).toBe('default');
    expect(result.structuredContent.count).toBe(4);
    expect(result.structuredContent.examples).toHaveLength(4);
  });

  it('filters by step', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({
      configPath: './flow.json',
      step: 'destination.gtag',
    });

    expect(result.structuredContent.count).toBe(2);
    expect(
      result.structuredContent.examples.every(
        (e: any) => e.step === 'destination.gtag',
      ),
    ).toBe(true);
  });

  it('excludes in/out/mapping by default (metadata only)', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    const purchase = result.structuredContent.examples.find(
      (e: any) => e.exampleName === 'purchase',
    );
    expect(purchase.hasMapping).toBe(true);
    expect(purchase.hasIn).toBe(true);
    expect(purchase.hasOut).toBe(true);
    expect(purchase.mapping).toBeUndefined();
    expect(purchase.in).toBeUndefined();
    expect(purchase.out).toBeUndefined();
  });

  it('includes in/out/mapping when full: true', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({
      configPath: './flow.json',
      full: true,
    });

    const purchase = result.structuredContent.examples.find(
      (e: any) => e.exampleName === 'purchase',
    );
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
    mockLoadJsonConfig.mockResolvedValue(multiFlowConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Multiple flows found');
  });

  it('errors on config load failure', async () => {
    mockLoadJsonConfig.mockRejectedValue(new Error('File not found'));

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './missing.json' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('File not found');
  });

  it('includes trigger metadata when full: true', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({
      configPath: './flow.json',
      full: true,
    });

    const browser = result.structuredContent.examples.find(
      (e: any) => e.exampleName === 'basic',
    );
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
    mockLoadJsonConfig.mockResolvedValue(configWithHidden as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.examples[0].exampleName).toBe('visible');
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
    mockLoadJsonConfig.mockResolvedValue(configWithHidden as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({
      configPath: './flow.json',
      includeHidden: true,
    });

    expect(result.structuredContent.count).toBe(2);
    const names = result.structuredContent.examples.map(
      (e: any) => e.exampleName,
    );
    expect(names).toContain('visible');
    expect(names).toContain('hidden');
    const hidden = result.structuredContent.examples.find(
      (e: any) => e.exampleName === 'hidden',
    );
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
    mockLoadJsonConfig.mockResolvedValue(configWithMetadata as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    const purchase = result.structuredContent.examples.find(
      (e: any) => e.exampleName === 'purchase',
    );
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
    mockLoadJsonConfig.mockResolvedValue(configNoExamples as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.structuredContent.count).toBe(0);
    expect(result.structuredContent.examples).toEqual([]);
  });

  it('tags inline examples with source: "inline"', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(
      result.structuredContent.examples.every(
        (e: any) => e.source === 'inline',
      ),
    ).toBe(true);
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
    mockLoadJsonConfig.mockResolvedValue(configNoInline as any);
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

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.count).toBe(2);
    expect(
      result.structuredContent.examples.every(
        (e: any) => e.source === 'package',
      ),
    ).toBe(true);
    const names = result.structuredContent.examples.map(
      (e: any) => e.exampleName,
    );
    expect(names).toContain('addToCart');
    expect(names).toContain('purchase');
    expect(mockFetchPackage).toHaveBeenCalledWith(
      '@walkeros/transformer-ga4',
      expect.any(Object),
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
    mockLoadJsonConfig.mockResolvedValue(configInline as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.examples[0].exampleName).toBe('custom');
    expect(result.structuredContent.examples[0].source).toBe('inline');
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
    mockLoadJsonConfig.mockResolvedValue(configNoPackage as any);

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.structuredContent.count).toBe(0);
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
    mockLoadJsonConfig.mockResolvedValue(configMixed as any);
    mockFetchPackage.mockRejectedValue(new Error('HTTP 404'));

    const tool = server.getTool('flow_examples');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.examples[0].exampleName).toBe('inlineOne');
    expect(result.structuredContent.examples[0].source).toBe('inline');
  });
});
