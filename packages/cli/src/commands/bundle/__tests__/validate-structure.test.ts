import { validateFlowStructure } from '../validate-structure';
import type { Flow } from '@walkeros/core';

// Guard: structural validation must never pull esbuild into the module graph.
// If validate-structure (or anything it imports transitively at module load)
// required esbuild, this spy would observe a build call. The function is
// synchronous and build-free, so esbuild.build is never invoked.
jest.mock('esbuild', () => ({
  build: jest.fn(() => {
    throw new Error(
      'esbuild.build must not be called by validateFlowStructure',
    );
  }),
  stop: jest.fn(),
}));

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
