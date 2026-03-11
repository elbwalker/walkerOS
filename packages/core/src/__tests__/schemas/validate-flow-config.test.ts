import { validateFlowConfig } from '../../schemas/validate-flow-config';

describe('validateFlowConfig', () => {
  // --- JSON Parse Errors ---

  it('returns error for invalid JSON', () => {
    const result = validateFlowConfig('{');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe('error');
    expect(result.errors[0].line).toBeGreaterThan(0);
  });

  it('returns error for empty string', () => {
    const result = validateFlowConfig('');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  // --- Schema Errors ---

  it('returns error for missing version', () => {
    const json = JSON.stringify({ flows: { default: { web: {} } } }, null, 2);
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid version', () => {
    const json = JSON.stringify(
      { version: 99, flows: { default: { web: {} } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
  });

  it('returns error for missing flows', () => {
    const json = JSON.stringify({ version: 3 }, null, 2);
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
  });

  it('passes for minimal valid config', () => {
    const json = JSON.stringify(
      { version: 3, flows: { default: { web: {} } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Line/Column Positions ---

  it('provides line/column for schema errors', () => {
    const json = JSON.stringify({ flows: {} }, null, 2);
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    for (const e of result.errors) {
      expect(e.line).toBeGreaterThan(0);
      expect(e.column).toBeGreaterThan(0);
    }
  });

  // --- Reference Warnings ---

  it('warns for dangling $var. reference', () => {
    const json = JSON.stringify(
      {
        version: 3,
        variables: { gaId: 'G-XXX' },
        flows: {
          default: {
            web: {},
            destinations: {
              ga4: {
                package: '@walkeros/web-destination-gtag',
                config: { settings: { id: '$var.nonExistent' } },
              },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true); // warnings don't make it invalid
    expect(
      result.warnings.some((w) => w.message.includes('$var.nonExistent')),
    ).toBe(true);
    expect(result.warnings[0].line).toBeGreaterThan(0);
  });

  it('does not warn for valid $var. reference', () => {
    const json = JSON.stringify(
      {
        version: 3,
        variables: { gaId: 'G-XXX' },
        flows: {
          default: {
            web: {},
            destinations: {
              ga4: {
                config: { settings: { id: '$var.gaId' } },
              },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(
      result.warnings.filter((w) => w.message.includes('$var.')),
    ).toHaveLength(0);
  });

  it('warns for dangling $def. reference', () => {
    const json = JSON.stringify(
      {
        version: 3,
        definitions: { clean: {} },
        flows: {
          default: {
            web: {},
            destinations: {
              ga4: { config: { transform: '$def.missing' } },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(
      result.warnings.some((w) => w.message.includes('$def.missing')),
    ).toBe(true);
  });

  // --- Context Extraction ---

  it('returns context with variables', () => {
    const json = JSON.stringify(
      {
        version: 3,
        variables: { gaId: 'G-XXX', debug: false },
        flows: { default: { web: {} } },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.variables).toEqual({ gaId: 'G-XXX', debug: false });
  });

  it('returns context with step names', () => {
    const json = JSON.stringify(
      {
        version: 3,
        flows: {
          default: {
            web: {},
            sources: { browser: {} },
            destinations: { ga4: {}, meta: {} },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.stepNames?.sources).toEqual(['browser']);
    expect(result.context?.stepNames?.destinations).toEqual(['ga4', 'meta']);
  });

  it('returns context with platform', () => {
    const json = JSON.stringify(
      { version: 3, flows: { default: { server: {} } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.platform).toBe('server');
  });

  it('returns context with packages', () => {
    const json = JSON.stringify(
      {
        version: 3,
        flows: {
          default: {
            web: {},
            sources: {
              browser: { package: '@walkeros/web-source-browser' },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.packages).toEqual([
      {
        package: '@walkeros/web-source-browser',
        shortName: 'browser',
        type: 'source',
        platform: 'web',
      },
    ]);
  });

  it('returns context with contract entities', () => {
    const json = JSON.stringify(
      {
        version: 3,
        contract: {
          default: {
            tagging: 1,
            events: { page: { view: {}, read: {} } },
          },
        },
        flows: { default: { web: {} } },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.contract).toEqual([
      { entity: 'page', actions: ['view', 'read'] },
    ]);
  });

  it('returns empty context for invalid JSON', () => {
    const result = validateFlowConfig('{');
    expect(result.context).toBeUndefined();
  });
});
