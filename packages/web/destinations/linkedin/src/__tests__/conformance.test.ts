import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationLinkedIn } from '..';
import { examples, schemas } from '../dev';

describe('linkedin conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationLinkedIn, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { apiKey: '123456' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
