import type { StandardEventName } from '@walkeros/core';
import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationOpenAIAds } from '..';
import { examples, schemas } from '../dev';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const { settings } = examples.minimal;
const env = { push: examples.env.push, simulation: examples.env.simulation };
const { pageView, productViewed, productAdded, purchase, ...others } =
  examples.step;
const claimed = { pageView, productViewed, productAdded, purchase };

describe('openai-ads conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationOpenAIAds, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events', async () => {
    await runExamples('destination', destinationOpenAIAds, claimed, {
      settings,
      env,
      claims: CLAIMS,
    });
  });

  it('sends the claimed standard events with its own rules', async () => {
    const withoutRules = Object.fromEntries(
      Object.entries(claimed).map(([name, { mapping, ...example }]) => [
        name,
        example,
      ]),
    );
    await runExamples('destination', destinationOpenAIAds, withoutRules, {
      settings,
      env,
    });
  });

  it('runs the other examples, failures included', async () => {
    await runExamples('destination', destinationOpenAIAds, others, {
      settings,
      env,
    });
  });
});
