import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationFullStory } from '..';
import { examples, schemas } from '../dev';

describe('fullstory conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationFullStory, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { orgId: 'o-TEST-na1' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
