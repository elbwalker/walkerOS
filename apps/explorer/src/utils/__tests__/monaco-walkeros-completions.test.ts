import {
  getVariableCompletions,
  getSecretCompletions,
  getStoreCompletions,
  getFlowCompletions,
  getEnvCompletions,
  getPackageCompletions,
  getStepNameCompletions,
  getContractCompletions,
  getMappingPathCompletions,
} from '../monaco-walkeros-completions';

describe('getVariableCompletions', () => {
  it('returns completions for defined variables', () => {
    const variables = { measurementId: 'G-XXX', debug: false };
    const items = getVariableCompletions(variables);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('$var.measurementId');
    expect(items[0].detail).toBe('= "G-XXX"');
  });

  it('returns empty array when no variables', () => {
    expect(getVariableCompletions(undefined)).toEqual([]);
    expect(getVariableCompletions({})).toEqual([]);
  });
});

describe('getSecretCompletions', () => {
  it('returns completions for secret names', () => {
    const items = getSecretCompletions(['GA_MEASUREMENT_ID', 'API_KEY']);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('$secret.GA_MEASUREMENT_ID');
    expect(items[0].detail).toBe('(secret)');
  });
});

describe('getStoreCompletions', () => {
  it('returns entries for each store', () => {
    const entries = getStoreCompletions(['cache', 'ttl']);
    expect(entries.map((e) => e.label)).toEqual(['$store.cache', '$store.ttl']);
    expect(entries[0].detail).toBe('(store)');
    expect(entries[0].kind).toBe('reference');
  });

  it('returns empty when no stores', () => {
    expect(getStoreCompletions(undefined)).toEqual([]);
    expect(getStoreCompletions([])).toEqual([]);
  });
});

describe('getFlowCompletions', () => {
  it('returns entries for each flow name', () => {
    const entries = getFlowCompletions(['web_prod', 'server_prod']);
    expect(entries.map((e) => e.label)).toEqual([
      '$flow.web_prod',
      '$flow.server_prod',
    ]);
    expect(entries[0].detail).toBe('(flow)');
    expect(entries[0].kind).toBe('reference');
  });

  it('returns empty when no flows', () => {
    expect(getFlowCompletions(undefined)).toEqual([]);
    expect(getFlowCompletions([])).toEqual([]);
  });
});

describe('getEnvCompletions', () => {
  it('returns entries for each env name', () => {
    const entries = getEnvCompletions(['API_URL', 'PORT']);
    expect(entries.map((e) => e.label)).toEqual(['$env.API_URL', '$env.PORT']);
    expect(entries[0].detail).toBe('(env var)');
    expect(entries[0].kind).toBe('variable');
  });

  it('returns empty when no envNames', () => {
    expect(getEnvCompletions(undefined)).toEqual([]);
    expect(getEnvCompletions([])).toEqual([]);
  });
});

describe('getPackageCompletions', () => {
  it('returns filtered completions for platform', () => {
    const packages = [
      {
        package: '@walkeros/web-source-browser',
        shortName: 'browser',
        type: 'source' as const,
        platform: 'web' as const,
      },
      {
        package: '@walkeros/server-source-express',
        shortName: 'express',
        type: 'source' as const,
        platform: 'server' as const,
      },
    ];
    const webItems = getPackageCompletions(packages, 'web');
    expect(webItems).toHaveLength(1);
    expect(webItems[0].label).toBe('@walkeros/web-source-browser');
  });

  it('returns all packages when no platform filter', () => {
    const packages = [
      {
        package: '@walkeros/web-source-browser',
        shortName: 'browser',
        type: 'source' as const,
        platform: 'web' as const,
      },
      {
        package: '@walkeros/server-source-express',
        shortName: 'express',
        type: 'source' as const,
        platform: 'server' as const,
      },
    ];
    const items = getPackageCompletions(packages, undefined);
    expect(items).toHaveLength(2);
  });
});

describe('getStepNameCompletions', () => {
  it('returns transformer names for "next" context', () => {
    const stepNames = { transformers: ['validator', 'router'] };
    const items = getStepNameCompletions(stepNames, 'next');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('validator');
  });

  it('returns transformer names for "before" context', () => {
    const stepNames = { transformers: ['validator'] };
    const items = getStepNameCompletions(stepNames, 'before');
    expect(items).toHaveLength(1);
  });
});

describe('getContractCompletions', () => {
  const contractRaw = {
    default: {
      tagging: 1,
      globals: {
        type: 'object',
        properties: { lang: { type: 'string' } },
      },
      events: {
        page: {
          view: {
            type: 'object',
            properties: { url: { type: 'string' } },
          },
        },
      },
    },
    web: { extends: 'default' },
  };

  it('returns contract names for empty path', () => {
    const items = getContractCompletions(contractRaw, []);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.map((i) => i.label)).toEqual(
      expect.arrayContaining(['$contract.default', '$contract.web']),
    );
    expect(items[0].kind).toBe('property');
  });

  it('returns entry keys for contract name path', () => {
    const items = getContractCompletions(contractRaw, ['default']);
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        '$contract.default.globals',
        '$contract.default.events',
      ]),
    );
  });

  it('returns entity names for events path', () => {
    const items = getContractCompletions(contractRaw, ['web', 'events']);
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining(['$contract.web.events.page']),
    );
  });

  it('returns empty for undefined contractRaw', () => {
    expect(getContractCompletions(undefined, [])).toEqual([]);
  });
});

describe('getMappingPathCompletions', () => {
  const contractRaw = {
    default: {
      globals: {
        type: 'object',
        properties: { lang: { type: 'string' }, env: { type: 'string' } },
      },
      user: {
        type: 'object',
        properties: { email: { type: 'string' } },
      },
      events: {
        page: {
          view: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              referrer: { type: 'string' },
            },
          },
        },
      },
    },
  };

  it('returns data properties for entity.action from contract', () => {
    const items = getMappingPathCompletions(
      contractRaw,
      'page',
      'view',
      'data',
    );
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining(['data.url', 'data.referrer']),
    );
  });

  it('returns globals properties', () => {
    const items = getMappingPathCompletions(
      contractRaw,
      'page',
      'view',
      'globals',
    );
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining(['globals.lang', 'globals.env']),
    );
  });

  it('returns user properties from contract', () => {
    const items = getMappingPathCompletions(
      contractRaw,
      'page',
      'view',
      'user',
    );
    const labels = items.map((i) => i.label);
    expect(labels).toContain('user.email');
  });

  it('returns built-in event fields when prefix is empty', () => {
    const items = getMappingPathCompletions(contractRaw, 'page', 'view', '');
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'data',
        'globals',
        'user',
        'context',
        'custom',
        'entity',
        'action',
        'name',
        'timestamp',
        'consent',
      ]),
    );
  });

  it('returns empty when no contract matches entity.action', () => {
    const items = getMappingPathCompletions(
      contractRaw,
      'order',
      'complete',
      'data',
    );
    expect(items).toEqual([]);
  });

  it('returns empty for undefined contractRaw', () => {
    expect(
      getMappingPathCompletions(undefined, 'page', 'view', 'data'),
    ).toEqual([]);
  });
});
