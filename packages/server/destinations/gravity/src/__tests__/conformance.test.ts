import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationGravity } from '..';
import { examples, schemas } from '../dev';

const { settings } = examples.minimal;

describe('gravity conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationGravity, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('runs every example on a real collector', async () => {
    // A 200 answer with a rejection is answered at the fetch boundary.
    const { rejected, ...others } = examples.step;
    await runExamples('destination', destinationGravity, others, {
      settings,
      env: examples.env,
    });
    await runExamples(
      'destination',
      destinationGravity,
      { rejected },
      {
        settings,
      },
    );
  });
});
