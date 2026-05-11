import { extractFlowIntelliSenseContext } from '../monaco-intellisense-flow-extractor';

describe('extractFlowIntelliSenseContext', () => {
  it('returns empty object for invalid JSON', () => {
    expect(extractFlowIntelliSenseContext('{')).toEqual({});
    expect(extractFlowIntelliSenseContext('')).toEqual({});
    expect(extractFlowIntelliSenseContext('not json')).toEqual({});
  });

  it('returns empty object for non-flow JSON', () => {
    expect(extractFlowIntelliSenseContext('{"foo": 1}')).toEqual({});
    expect(extractFlowIntelliSenseContext('[1,2,3]')).toEqual({});
  });

  it('extracts setup-level variables', () => {
    const json = JSON.stringify({
      version: 4,
      variables: { gaId: 'G-XXX', debug: false },
      flows: { default: { config: { platform: 'web' } } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({ gaId: 'G-XXX', debug: false });
  });

  it('merges variables from setup, config, and step levels', () => {
    const json = JSON.stringify({
      version: 4,
      variables: { gaId: 'G-XXX', shared: 'setup' },
      flows: {
        default: {
          config: { platform: 'web' },
          variables: { flowVar: 'flow', shared: 'flow-override' },
          destinations: {
            ga4: {
              package: '@walkeros/web-destination-gtag',
              variables: { stepVar: 'step' },
            },
          },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({
      gaId: 'G-XXX',
      shared: 'flow-override',
      flowVar: 'flow',
      stepVar: 'step',
    });
  });

  it('extracts structural variables from all levels', () => {
    const json = JSON.stringify({
      version: 4,
      variables: { commonSettings: { key: 'value' } },
      flows: {
        default: {
          config: { platform: 'web' },
          variables: { flowVar: { x: 1 } },
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              variables: { stepVar: { y: 2 } },
            },
          },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({
      commonSettings: { key: 'value' },
      flowVar: { x: 1 },
      stepVar: { y: 2 },
    });
  });

  it('extracts step names by type', () => {
    const json = JSON.stringify({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          sources: { browser: {}, dataLayer: {} },
          destinations: { ga4: {}, meta: {} },
          transformers: { validate: {}, enrich: {} },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.stepNames).toEqual({
      sources: ['browser', 'dataLayer'],
      destinations: ['ga4', 'meta'],
      transformers: ['validate', 'enrich'],
    });
  });

  it('extracts packages from step references', () => {
    const json = JSON.stringify({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          sources: {
            browser: { package: '@walkeros/web-source-browser' },
          },
          destinations: {
            ga4: { package: '@walkeros/web-destination-gtag' },
          },
          transformers: {
            validate: { package: '@walkeros/transformer-validator' },
          },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.packages).toEqual([
      {
        package: '@walkeros/web-source-browser',
        shortName: 'browser',
        type: 'source',
        platform: 'web',
      },
      {
        package: '@walkeros/web-destination-gtag',
        shortName: 'ga4',
        type: 'destination',
        platform: 'web',
      },
      {
        package: '@walkeros/transformer-validator',
        shortName: 'validate',
        type: 'transformer',
        platform: 'web',
      },
    ]);
  });

  it('detects web platform', () => {
    const json = JSON.stringify({
      version: 4,
      flows: { default: { config: { platform: 'web' } } },
    });
    expect(extractFlowIntelliSenseContext(json).platform).toBe('web');
  });

  it('detects server platform', () => {
    const json = JSON.stringify({
      version: 4,
      flows: { default: { config: { platform: 'server' } } },
    });
    expect(extractFlowIntelliSenseContext(json).platform).toBe('server');
  });

  it('extracts contract entities and actions', () => {
    const json = JSON.stringify({
      version: 4,
      contract: {
        $tagging: 1,
        page: { view: {}, read: {} },
        product: { add: {}, remove: {} },
      },
      flows: { default: { config: { platform: 'web' } } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.contract).toEqual([
      { entity: 'page', actions: ['view', 'read'] },
      { entity: 'product', actions: ['add', 'remove'] },
    ]);
  });

  it('merges contract from setup and config level', () => {
    const json = JSON.stringify({
      version: 4,
      contract: { page: { view: {} } },
      flows: {
        default: {
          config: { platform: 'web' },
          contract: { product: { add: {} } },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.contract).toEqual([
      { entity: 'page', actions: ['view'] },
      { entity: 'product', actions: ['add'] },
    ]);
  });

  it('handles multiple flows by merging all', () => {
    const json = JSON.stringify({
      version: 4,
      flows: {
        web_prod: {
          config: { platform: 'web' },
          variables: { gaId: 'G-PROD' },
          sources: { browser: {} },
        },
        server_prod: {
          config: { platform: 'server' },
          variables: { apiUrl: 'https://api.example.com' },
          sources: { express: {} },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({
      gaId: 'G-PROD',
      apiUrl: 'https://api.example.com',
    });
    expect(ctx.stepNames?.sources).toContain('browser');
    expect(ctx.stepNames?.sources).toContain('express');
  });

  it('handles partial flow (only version and flows key)', () => {
    const json = JSON.stringify({
      version: 4,
      flows: { default: { config: { platform: 'web' } } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({});
    expect(ctx.stepNames).toEqual({
      sources: [],
      destinations: [],
      transformers: [],
    });
  });
});

describe('extractFlowIntelliSenseContext — stores', () => {
  it('collects store IDs from active flow', () => {
    const result = extractFlowIntelliSenseContext(
      JSON.stringify({
        version: 4,
        flows: {
          server: {
            config: { platform: 'server' },
            stores: {
              cache: { package: '@walkeros/store-memory' },
              ttl: {},
            },
          },
        },
      }),
    );
    expect(result.stores).toEqual(expect.arrayContaining(['cache', 'ttl']));
  });
});

describe('extractFlowIntelliSenseContext — cascade priority', () => {
  it('step-level variables override flow-level override config', () => {
    const result = extractFlowIntelliSenseContext(
      JSON.stringify({
        version: 4,
        variables: { mode: 'config' },
        flows: {
          web: {
            config: { platform: 'web' },
            variables: { mode: 'flow' },
            sources: {
              browser: { variables: { mode: 'step' } },
            },
          },
        },
      }),
    );
    expect(result.variables?.mode).toBe('step');
  });

  it('missing step variables fall back to flow then config', () => {
    const result = extractFlowIntelliSenseContext(
      JSON.stringify({
        version: 4,
        variables: { foo: 'config' },
        flows: {
          web: {
            config: { platform: 'web' },
            variables: { bar: 'flow' },
            sources: { browser: { variables: { baz: 'step' } } },
          },
        },
      }),
    );
    expect(result.variables?.foo).toBe('config');
    expect(result.variables?.bar).toBe('flow');
    expect(result.variables?.baz).toBe('step');
  });
});
