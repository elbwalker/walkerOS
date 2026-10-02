import type { Flow } from '@walkeros/core';
import { collectKnownSecrets } from '../known-secrets.js';

function flowWith(...refs: string[]): Flow.Json {
  return {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { settings: { keys: refs, nested: { key: refs[0] } } },
          },
        },
      },
    },
  };
}

describe('collectKnownSecrets', () => {
  it('returns the value of each referenced secret', () => {
    expect(
      collectKnownSecrets(flowWith('$secret.GCP_SA'), { GCP_SA: 'value-123' }),
    ).toEqual(['value-123']);
  });

  it('ignores unset and empty names and unreferenced env values', () => {
    expect(
      collectKnownSecrets(
        flowWith('$secret.GCP_SA', '$secret.UNSET', '$secret.EMPTY'),
        { GCP_SA: 'value-123', EMPTY: '', OTHER: 'not-referenced' },
      ),
    ).toEqual(['value-123']);
  });

  it('only counts whole-value references', () => {
    expect(
      collectKnownSecrets(flowWith('prefix $secret.GCP_SA'), {
        GCP_SA: 'value-123',
      }),
    ).toEqual([]);
  });
});
