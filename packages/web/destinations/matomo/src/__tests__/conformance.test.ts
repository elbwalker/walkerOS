import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationMatomo } from '..';
import { examples, schemas } from '../dev';

describe('matomo conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMatomo, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { siteId: '1', url: 'https://analytics.example.com/' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
