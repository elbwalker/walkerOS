import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationTwitter } from '..';
import { examples, schemas } from '../dev';

describe('twitter conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationTwitter, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        pixelId: 'o8z6j',
        eventId: 'tw-o8z6j-o8z21',
        consumerKey: 'consumer-key',
        consumerSecret: 'consumer-secret',
        accessToken: 'access-token',
        accessTokenSecret: 'access-token-secret',
      },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
