import path from 'path';
import type { WalkerOS } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { startFlow } from '@walkeros/collector';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { storeApiInit } from '..';
import { examples, schemas } from '../dev';

const settings = { url: 'https://crm.example.com/customers/{key}' };
const env = { push: examples.env.push, simulation: examples.env.simulation };

describe('api store step examples', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('conforms', async () => {
    await conformance('store', storeApiInit, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('reports a refused read from a real HTTP answer instead of a miss', async () => {
    // Without the examples env the request reaches the kit's fetch boundary,
    // which answers the example's 401 as an HTTP response.
    const { unauthorized } = examples.step;
    await runExamples('store', storeApiInit, { unauthorized }, { settings });
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));

  it('a flow on the examples env never reaches the network', async () => {
    const globalFetch = jest.spyOn(globalThis, 'fetch');
    const delivered: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      stores: {
        crm: {
          code: storeApiInit,
          config: { settings, credentials: { token: 'example-token' } },
          env: examples.env.push,
        },
      },
      transformers: {
        loadUser: {
          state: {
            mode: 'get',
            store: 'crm',
            key: 'event.user.id',
            value: 'event.user',
            mapping: {
              map: {
                ltv: 'ltv',
                segment: { key: 'segment', value: 'unknown' },
              },
            },
          },
        },
      },
      destinations: {
        spy: {
          before: 'loadUser',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              delivered.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'order complete', user: { id: 'cust-42' } });
    await elb({ name: 'order complete', user: { id: 'cust-404' } });

    expect(delivered.map(({ user }) => user)).toEqual([
      { id: 'cust-42', ltv: 420, segment: 'loyal' },
      { id: 'cust-404', segment: 'unknown' },
    ]);
    expect(globalFetch).not.toHaveBeenCalled();
  });
});
