import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationPlausible } from '..';
import { examples, schemas } from '../dev';

const env = { push: examples.env.push, simulation: examples.env.simulation };

// The push examples; the init example runs in stepExamples.test.ts.
const { init: _init, ...events } = examples.step;

describe('plausible conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPlausible, {
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

  it('records the calls each example names', async () => {
    await runExamples('destination', destinationPlausible, events, {
      settings: examples.minimal.settings,
      config: examples.minimal.config,
      env,
      page,
    });
  });
});
