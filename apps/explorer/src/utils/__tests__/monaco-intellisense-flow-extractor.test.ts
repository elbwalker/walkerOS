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
      version: 1,
      variables: { gaId: 'G-XXX', debug: false },
      flows: { default: { web: {} } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({ gaId: 'G-XXX', debug: false });
  });

  it('merges variables from setup, config, and step levels', () => {
    const json = JSON.stringify({
      version: 1,
      variables: { gaId: 'G-XXX', shared: 'setup' },
      flows: {
        default: {
          web: {},
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

  it('extracts definitions from all levels', () => {
    const json = JSON.stringify({
      version: 1,
      definitions: { commonSettings: { key: 'value' } },
      flows: {
        default: {
          web: {},
          definitions: { flowDef: { x: 1 } },
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
              definitions: { stepDef: { y: 2 } },
            },
          },
        },
      },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.definitions).toEqual({
      commonSettings: { key: 'value' },
      flowDef: { x: 1 },
      stepDef: { y: 2 },
    });
  });

  it('extracts step names by type', () => {
    const json = JSON.stringify({
      version: 1,
      flows: {
        default: {
          web: {},
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
      version: 1,
      flows: {
        default: {
          web: {},
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
      version: 1,
      flows: { default: { web: {} } },
    });
    expect(extractFlowIntelliSenseContext(json).platform).toBe('web');
  });

  it('detects server platform', () => {
    const json = JSON.stringify({
      version: 1,
      flows: { default: { server: {} } },
    });
    expect(extractFlowIntelliSenseContext(json).platform).toBe('server');
  });

  it('extracts contract entities and actions', () => {
    const json = JSON.stringify({
      version: 1,
      contract: {
        $tagging: 1,
        page: { view: {}, read: {} },
        product: { add: {}, remove: {} },
      },
      flows: { default: { web: {} } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.contract).toEqual([
      { entity: 'page', actions: ['view', 'read'] },
      { entity: 'product', actions: ['add', 'remove'] },
    ]);
  });

  it('merges contract from setup and config level', () => {
    const json = JSON.stringify({
      version: 1,
      contract: { page: { view: {} } },
      flows: {
        default: {
          web: {},
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
      version: 1,
      flows: {
        web_prod: {
          web: {},
          variables: { gaId: 'G-PROD' },
          sources: { browser: {} },
        },
        server_prod: {
          server: {},
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
      version: 1,
      flows: { default: { web: {} } },
    });
    const ctx = extractFlowIntelliSenseContext(json);
    expect(ctx.variables).toEqual({});
    expect(ctx.definitions).toEqual({});
    expect(ctx.stepNames).toEqual({
      sources: [],
      destinations: [],
      transformers: [],
    });
  });
});
