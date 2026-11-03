import type { StandardEventName } from '@walkeros/core';
import path from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { clone, createLogger, observeEnv } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { page } from '@walkeros/web-core/dev';
import type { Config } from '../types';
import { destinationMeta } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const settings = { pixelId: '1234567890' };
const env = { push: examples.env.push, simulation: examples.env.simulation };

const { init, ...events } = examples.step;

describe('meta conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMeta, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationMeta, events, {
      settings,
      env,
      page,
      claims: CLAIMS,
    });
  });

  // The runner keeps init calls out of every out, so the init example runs here.
  it('runs the init example', async () => {
    const config: Config = { loadScript: true, settings };
    expect(init.in).toEqual(config);

    const observed = observeEnv(
      clone(examples.env.push),
      examples.env.simulation,
    );
    const { collector } = await startFlow();
    await destinationMeta.init?.({
      id: 'meta',
      config,
      env: observed.env,
      logger: createLogger(),
      collector,
    });

    expect(observed.calls.map(({ fn, args }) => [fn, ...args])).toEqual(
      init.out,
    );
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
