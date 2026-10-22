import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import destinationPiano from '..';
import { examples, schemas } from '../dev';

describe('piano conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationPiano, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { site: 123456789, collectDomain: 'https://example.pa-cd.com' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
