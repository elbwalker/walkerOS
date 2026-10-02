import { validateFlowStructure } from '../validate-structure';
import type { Flow } from '../types/flow';

function flow(flows: Record<string, Flow>): Flow.Json {
  return { version: 4, flows };
}

describe('validateFlowStructure', () => {
  it('accepts a valid single-flow config', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        sources: {
          browser: { package: '@walkeros/web-source-browser' },
        },
        destinations: {
          gtag: { package: '@walkeros/web-destination-gtag' },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('flow');
    expect(result.errors).toEqual([]);
    expect(result.details.flowNames).toEqual(['default']);
  });

  it('rejects a config with no flows', () => {
    const result = validateFlowStructure(flow({}));

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('EMPTY_FLOWS');
  });

  it('flags a component name that is not a valid JS identifier', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        destinations: {
          'gtag-wrapper': { package: '@walkeros/web-destination-gtag' },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'INVALID_COMPONENT_NAME',
    );
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.destinations');
    expect(error?.message).toMatch(/valid JavaScript identifier/);
  });

  it('flags a source with neither package nor code', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        sources: {
          browser: {},
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'INVALID_REFERENCE');
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.sources.browser');
    expect(error?.message).toMatch(/Must specify either package or code/);
  });

  it('reports every dangling $store. reference, not just the first', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { token: '$store.alpha', extra: '$store.beta' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'STORE_REFERENCE_NOT_FOUND',
    );
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/alpha/);
    expect(error?.message).toMatch(/beta/);
  });

  it('flags a dangling $store. reference', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { token: '$store.missing' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'STORE_REFERENCE_NOT_FOUND',
    );
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/store "missing" not found/);
  });

  it('accepts a $store. reference that resolves to a defined store', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        stores: {
          secrets: { package: '@walkeros/server-store-memory' },
        },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { token: '$store.secrets' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags a transformer entry that sets both code and package via the closed schema', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        transformers: {
          // Setting both `code` and `package` is a closed-schema CONFLICT.
          enrich: {
            package: '@walkeros/transformer-noop',
            code: { push: '$code:(event) => event' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'CONFLICT');
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.transformers.enrich');
  });

  it('runs synchronously and returns without building', () => {
    // Synchronous: the return value is a plain object, not a Promise.
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          sources: { browser: { package: '@walkeros/web-source-browser' } },
        },
      }),
    );

    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.valid).toBe('boolean');
  });
});

describe('state store references', () => {
  const entry = (store?: string) => ({
    mode: 'get' as const,
    ...(store === undefined ? {} : { store }),
    key: 'event.user.id',
    value: 'event.user.ltv',
  });

  const stateCodes = (config: Flow.Json) =>
    validateFlowStructure(config).errors.filter((error) =>
      error.code?.startsWith('STATE_STORE_'),
    );

  it('STATE_STORE_UNKNOWN when state.store is not declared', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: entry('customers'),
            },
          },
        },
      }),
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.filter((error) => error.code?.startsWith('STATE_STORE_')),
    ).toEqual([
      expect.objectContaining({
        code: 'STATE_STORE_UNKNOWN',
        path: 'flows.default.transformers.loadUser.state',
      }),
    ]);
  });

  it('a declared store passes', () => {
    expect(
      stateCodes(
        flow({
          default: {
            stores: { customers: { package: '@walkeros/server-store-fs' } },
            transformers: {
              loadUser: {
                package: '@walkeros/transformer-noop',
                state: entry('customers'),
              },
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it('an omitted store, an explicit __cache and a $ reference pass', () => {
    expect(
      stateCodes(
        flow({
          default: {
            transformers: {
              loadUser: {
                package: '@walkeros/transformer-noop',
                state: [entry(), entry('__cache'), entry('$var.store')],
              },
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it('STATE_STORE_FILE when the store sets file: true', () => {
    const errors = stateCodes(
      flow({
        default: {
          stores: {
            customers: {
              package: '@walkeros/server-store-fs',
              config: { file: true },
            },
          },
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: entry('customers'),
            },
          },
        },
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('STATE_STORE_FILE');
  });

  it('config.state is scanned too', () => {
    const errors = stateCodes(
      flow({
        default: {
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
              config: { state: entry('customers') },
            },
          },
        },
      }),
    );

    expect(errors.map((error) => error.path)).toEqual([
      'flows.default.destinations.api.config.state',
    ]);
  });

  it('every array entry is scanned, the index is in the path', () => {
    const errors = stateCodes(
      flow({
        default: {
          stores: { customers: { package: '@walkeros/server-store-fs' } },
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: [entry('customers'), entry('profiles')],
            },
          },
        },
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toMatch(/\.state\.1$/);
  });
});
