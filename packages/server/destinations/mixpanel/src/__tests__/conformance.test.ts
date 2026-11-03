import path from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance } from '@walkeros/collector/dev';
import type { Logger } from '@walkeros/core';
import { clone, createEvent, Level } from '@walkeros/core';
import { destinationMixpanel } from '..';
import { examples, schemas } from '../dev';

describe('mixpanel conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationMixpanel, {
      profile: 'sdk-env',
      examples: examples.step,
      schema: schemas.settings,
      settings: examples.minimal.settings,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      minimal: examples.minimal,
      root: path.join(__dirname, '..', '..'),
    });
  });
});

describe('mixpanel declared skips', () => {
  it('write one DEBUG line naming the event and the mapping key', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const event = createEvent({ name: 'company update' });
    const { collector } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        mixpanel: {
          code: { ...destinationMixpanel, env: clone(examples.env.push) },
          config: {
            settings: { apiKey: 'token' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: {
                    groupProfile: {
                      map: { key: 'data.none', id: 'data.none' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    await collector.push(event);

    const skipped = lines.filter(([, message]) => message.includes('skipped'));
    expect(skipped).toHaveLength(1);
    expect(skipped[0][0]).toBe(Level.DEBUG);
    expect(skipped[0][1]).toBe(
      'Mixpanel skipped groupProfile: groupProfile resolved to nothing',
    );
    expect(skipped[0][2]).toMatchObject({ mappingKey: 'groupProfile' });
  });
});
