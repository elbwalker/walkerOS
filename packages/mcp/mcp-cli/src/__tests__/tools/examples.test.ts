import { registerExamplesListTool } from '../../tools/examples.js';
import { ExamplesListOutputShape } from '../../schemas/output.js';

// Mock @walkeros/cli
jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
}));

import { loadJsonConfig } from '@walkeros/cli';
const mockLoadJsonConfig = jest.mocked(loadJsonConfig);

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
  version: 1,
  flows: {
    default: {
      web: {},
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          examples: {
            basic: {
              in: { name: 'page view' },
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

describe('examples_list tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerExamplesListTool(server as any);
    mockLoadJsonConfig.mockReset();
  });

  it('registers with correct name, title, and annotations', () => {
    const tool = server.getTool('examples_list');
    expect(tool).toBeDefined();

    const config = tool.config as any;
    expect(config.title).toBe('List Step Examples');
    expect(config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('has outputSchema defined', () => {
    const tool = server.getTool('examples_list');
    const config = tool.config as any;
    expect(config.outputSchema).toBe(ExamplesListOutputShape);
  });

  it('returns all examples from a single-flow config', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flow).toBe('default');
    expect(parsed.count).toBe(4);
    expect(parsed.examples).toHaveLength(4);

    // Verify example names
    const names = parsed.examples.map((e: any) => e.exampleName);
    expect(names).toContain('basic');
    expect(names).toContain('purchase');
    expect(names).toContain('pageview');
    expect(names).toContain('enrich_order');
  });

  it('returns structured content', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.flow).toBe('default');
    expect(result.structuredContent.count).toBe(4);
  });

  it('filters by --step', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({
      configPath: './flow.json',
      step: 'destination.gtag',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(2);
    expect(
      parsed.examples.every((e: any) => e.step === 'destination.gtag'),
    ).toBe(true);
  });

  it('selects flow with --flow in multi-flow config', async () => {
    const multiFlowConfig = {
      version: 1,
      flows: {
        production: {
          web: {},
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              examples: {
                prod_example: { in: { name: 'page view' } },
              },
            },
          },
        },
        staging: {
          web: {},
          destinations: {},
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(multiFlowConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: 'production',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.flow).toBe('production');
    expect(parsed.count).toBe(1);
    expect(parsed.examples[0].exampleName).toBe('prod_example');
  });

  it('errors on multi-flow without --flow', async () => {
    const multiFlowConfig = {
      version: 1,
      flows: {
        production: { web: {} },
        staging: { web: {} },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(multiFlowConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './flow.json' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Multiple flows found');
  });

  it('errors on missing flow', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({
      configPath: './flow.json',
      flow: 'nonexistent',
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('not found');
  });

  it('errors on config load failure', async () => {
    mockLoadJsonConfig.mockRejectedValue(new Error('File not found'));

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './missing.json' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('File not found');
  });

  it('includes hasIn and hasOut flags', async () => {
    mockLoadJsonConfig.mockResolvedValue(sampleConfig as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './flow.json' });

    const parsed = JSON.parse(result.content[0].text);
    const basic = parsed.examples.find((e: any) => e.exampleName === 'basic');
    expect(basic.hasIn).toBe(true);
    expect(basic.hasOut).toBe(false);

    const purchase = parsed.examples.find(
      (e: any) => e.exampleName === 'purchase',
    );
    expect(purchase.hasIn).toBe(true);
    expect(purchase.hasOut).toBe(true);
  });

  it('returns empty examples array when no examples exist', async () => {
    const configNoExamples = {
      version: 1,
      flows: {
        default: {
          web: {},
          destinations: {
            gtag: { package: '@walkeros/web-destination-gtag' },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(configNoExamples as any);

    const tool = server.getTool('examples_list');
    const result = await tool.handler({ configPath: './flow.json' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(0);
    expect(parsed.examples).toEqual([]);
  });
});
