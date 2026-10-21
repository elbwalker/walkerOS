import { startFlow } from '@walkeros/collector';
import { clone, getEvent } from '@walkeros/core';
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
  amplitude.initAll = () => {
    calls.push('initAll');
    return Promise.resolve();
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

  it.each<[string, Partial<Settings>]>([
    ['sessionReplay', { sessionReplay: { sampleRate: 1 } }],
    ['experiment', { experiment: { deploymentKey: 'deployment' } }],
    ['engagement', { engagement: true }],
  ])('starts the plugins when %s is set', async (_name, plugin) => {
    expect(await initCalls({ apiKey: 'key', ...plugin })).toEqual(['initAll']);
  });
});
