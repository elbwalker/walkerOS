import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { destinationTikTok } from '..';
import { examples, schemas } from '../dev';

const { settings } = examples.minimal;

describe('tiktok conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationTikTok, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('fails an event TikTok rejects in its HTTP 200 body', async () => {
    const { rejectedEvent, busy } = examples.step;
    await runExamples(
      'destination',
      destinationTikTok,
      { rejectedEvent, busy },
      { settings },
    );
  });
});
