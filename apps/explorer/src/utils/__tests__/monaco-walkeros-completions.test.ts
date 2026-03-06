import {
  getVariableCompletions,
  getDefinitionCompletions,
  getSecretCompletions,
  getPackageCompletions,
  getStepNameCompletions,
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

describe('getDefinitionCompletions', () => {
  it('returns completions for defined definitions', () => {
    const definitions = { gaConfig: { settings: {} }, metaConfig: {} };
    const items = getDefinitionCompletions(definitions);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('$def.gaConfig');
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
