import type { StandardEventName } from '@walkeros/core';
import type { StepExample } from '../examples/step';
import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { destinationPiwikPro } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const { settings } = examples.minimal;
const env = { push: examples.env.push, simulation: examples.env.simulation };

// The examples with their own settings run on their own.
const { customDimensions, anonymous, ...events } = examples.step;

describe('piwikpro conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPiwikPro, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationPiwikPro, events, {
      settings,
      env,
      claims: CLAIMS,
    });
  });

  it.each<[string, StepExample]>([
    ['customDimensions', customDimensions],
    ['anonymous', anonymous],
  ])('runs %s with its settings', async (name, example) => {
    await runExamples(
      'destination',
      destinationPiwikPro,
      { [name]: example },
      { settings: { ...settings, ...example.settings }, env },
    );
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
