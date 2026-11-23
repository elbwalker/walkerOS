import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationReddit } from '..';
import { examples, schemas } from '../dev';

const { settings } = examples.minimal;

describe('reddit conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationReddit, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('fails an event Reddit did not process in its HTTP 200 body', async () => {
    const { notProcessed } = examples.step;
    await runExamples(
      'destination',
      destinationReddit,
      { notProcessed },
      { settings },
    );
  });
});
