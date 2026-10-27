import type { StandardEventName } from '@walkeros/core';
import path from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { clone, createLogger, observeEnv } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { page } from '@walkeros/web-core/dev';
import type { Config } from '../types';
import { destinationPiwikPro } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const settings = {
  appId: 'XXX-XXX-XXX-XXX-XXX',
  url: 'https://your_account_name.piwik.pro/',
};
const env = { push: examples.env.push, simulation: examples.env.simulation };

const { init, linkTrackingAfterFirstHit, ...events } = examples.step;

describe('piwikpro conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPiwikPro, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      minimal: examples.minimal,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  // Every runner example is a page's first hit: without link tracking its
  // out holds only the event's own commands.
  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationPiwikPro, events, {
      settings: { ...settings, linkTracking: false },
      env,
      page,
      claims: CLAIMS,
    });
  });

  it('enables link tracking after the first hit by default', async () => {
    await runExamples(
      'destination',
      destinationPiwikPro,
      { linkTrackingAfterFirstHit },
      { settings, env, page },
    );
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
    await destinationPiwikPro.init?.({
      id: 'piwikpro',
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
