import type { StandardEventName } from '@walkeros/core';
import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { destinationMeta } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const { settings } = examples.minimal;

describe('meta conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMeta, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationMeta, examples.step, {
      settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      claims: CLAIMS,
    });
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
