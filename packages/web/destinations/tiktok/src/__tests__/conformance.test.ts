import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationTikTok } from '..';
import { examples, schemas } from '../dev';
import type { TikTokStepExample } from '../examples/step';

const env = { push: examples.env.push, simulation: examples.env.simulation };

// The published examples, each run with the settings and config it names.
const published = Object.entries<TikTokStepExample>(examples.step).filter(
  ([, example]) => example.public !== false,
);

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
      minimal: examples.minimal,
      env,
      root: path.join(__dirname, '..', '..'),
      passThrough: ['auto_config', 'limited_data_use'],
    });
  });

  it.each(published)('records the calls %s names', async (name, example) => {
    const grant = example.command === 'consent' && !example.before;
    await runExamples(
      'destination',
      destinationTikTok,
      { [name]: example },
      {
        settings: { apiKey: 'C4A1B2C3D4E5F6A7B8C9', ...example.settings },
        config: {
          ...(example.configInclude ? { include: example.configInclude } : {}),
          ...(grant ? { consent: { marketing: true } } : {}),
        },
        env,
        page,
      },
    );
  });
});
