import { getFlowSettings } from '../flow';
import type { Flow } from '../types';

describe('Flow.Store.cache survives resolve+emit', () => {
  it('keeps cache field on emitted store', () => {
    const setup: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          stores: {
            mem: { package: '@walkeros/server-store-fs', config: {} },
            api: {
              package: '@walkeros/server-store-api',
              config: {},
              cache: { store: 'mem', rules: [{ ttl: 60 }] },
            },
          },
        },
      },
    };
    const resolved = getFlowSettings(setup);
    expect(resolved.stores?.api.cache).toEqual({
      store: 'mem',
      rules: [{ ttl: 60 }],
    });
  });
});
