import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { clone, createEvent, getEvent, Level } from '@walkeros/core';
import { destinationAmplitude } from '..';
import { examples } from '../dev';
import type { Settings } from '../types';

async function initCalls(settings: Settings): Promise<string[]> {
  const calls: string[] = [];
  const env = clone(examples.env.push);
  const amplitude = env.amplitude;
  if (!amplitude) throw new Error('env.amplitude missing');
  amplitude.init = () => {
    calls.push('init');
    return { promise: Promise.resolve() };
  };
  amplitude.add = (plugin) => {
    calls.push(`add ${plugin.name}`);
    return { promise: Promise.resolve() };
  };
  const { elb } = await startFlow({
    destinations: {
      amplitude: { code: destinationAmplitude, config: { settings, env } },
    },
  });
  await elb(getEvent('page view'));
  return calls;
}

describe('amplitude destination', () => {
  it('starts analytics alone when no plugin is enabled', async () => {
    expect(await initCalls({ apiKey: 'key' })).toEqual(['init']);
  });

  it.each<[Partial<Settings>, string]>([
    [
      { sessionReplay: { sampleRate: 1 } },
      '@amplitude/plugin-session-replay-browser',
    ],
    [
      { experiment: { deploymentKey: 'deployment' } },
      '@amplitude/experiment-analytics-plugin',
    ],
    [{ engagement: true }, '@amplitude/engagement-browser'],
  ])(
    'starts analytics and only the plugin %j enables',
    async (plugin, name) => {
      expect(await initCalls({ apiKey: 'key', ...plugin })).toEqual([
        'init',
        `add ${name}`,
      ]);
    },
  );

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: {
            settings: { apiKey: 'key' },
            env: clone(examples.env.push),
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: {
                    group: {
                      map: { type: { value: 'company' }, name: 'data.none' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect((await elb(createEvent({ name: 'company update' }))).ok).toBe(true);
    expect(lines.filter(([, message]) => message.includes('skipped'))).toEqual([
      [
        Level.DEBUG,
        'Amplitude skipped setGroup: group resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
