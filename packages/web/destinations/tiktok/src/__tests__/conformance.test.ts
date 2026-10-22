import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationTikTok } from '..';
import { examples, schemas } from '../dev';

describe('tiktok conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationTikTok, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'C4A1B2C3D4E5F6A7B8C9',
        auto_config: true,
        limited_data_use: false,
      },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
      passThrough: ['auto_config', 'limited_data_use'],
    });
  });
});
