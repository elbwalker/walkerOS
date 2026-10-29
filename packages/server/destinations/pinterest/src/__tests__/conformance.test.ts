import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationPinterest } from '..';
import { examples, schemas } from '../dev';

const { settings } = examples.minimal;

describe('pinterest conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPinterest, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('fails an event Pinterest rejects in its HTTP 200 body', async () => {
    const { rejectedEvent } = examples.step;
    await runExamples(
      'destination',
      destinationPinterest,
      { rejectedEvent },
      { settings },
    );
  });
});
