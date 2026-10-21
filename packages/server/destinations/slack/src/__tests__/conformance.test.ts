import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationSlack } from '..';
import { examples, schemas } from '../dev';

describe('slack conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSlack, {
      profile: 'http',
      examples: examples.step,
      schema: schemas.settings,
      settings: { webhookUrl: 'https://hooks.slack.com/services/x/y/z' },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
