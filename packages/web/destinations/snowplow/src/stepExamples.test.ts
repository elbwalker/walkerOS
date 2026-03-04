import type { WalkerOS } from '@walkeros/core';
import type { DestinationSnowplow } from '.';
import type { DestinationWeb } from '@walkeros/web-core';
import { startFlow } from '@walkeros/collector';
import { mockEnv } from '@walkeros/core';
import { examples } from '.';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const calls: Array<{ path: string[]; args: unknown[] }> = [];
    const testEnv: DestinationWeb.Env = mockEnv(
      examples.env.push,
      (path, args) => {
        calls.push({ path, args });
      },
    );

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: testEnv as DestinationSnowplow.Env },
      {
        settings: {
          collectorUrl: 'https://collector.example.com',
          appId: 'test-app',
          pageViewEvent: 'page view',
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const snowplowCalls = calls.filter(
      (c) => c.path.join('.') === 'window.snowplow',
    );
    const outArgs = example.out as unknown[];
    const matchingCall = snowplowCalls.find((c) => c.args[0] === outArgs[0]);
    expect(matchingCall).toBeDefined();
    if (outArgs.length > 1) {
      expect(matchingCall!.args[1]).toEqual(outArgs[1]);
    }
  });
});
