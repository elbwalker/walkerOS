import type { Destination, StandardEventName } from '@walkeros/core';
import type { StepExample } from '../examples/step';
import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { destinationMatomo } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'cart view',
  'order complete',
];

const { settings } = examples.minimal;
const env = { push: examples.env.push, simulation: examples.env.simulation };

// The examples with their own settings run on their own.
const {
  withToken,
  customDimensions,
  twoSitesA,
  twoSitesB,
  ipWithoutToken,
  ...events
} = examples.step;

describe('matomo conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMatomo, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationMatomo, events, {
      settings,
      env,
      claims: CLAIMS,
    });
  });

  it.each<[string, StepExample, Partial<Destination.Config>]>([
    ['withToken', withToken, { credentials: { token: 'TOKEN' } }],
    ['customDimensions', customDimensions, {}],
    ['twoSitesA', twoSitesA, {}],
    ['twoSitesB', twoSitesB, {}],
    ['ipWithoutToken', ipWithoutToken, {}],
  ])('runs %s with its settings', async (name, example, config) => {
    await runExamples(
      'destination',
      destinationMatomo,
      { [name]: example },
      { settings: { ...settings, ...example.settings }, env, config },
    );
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
