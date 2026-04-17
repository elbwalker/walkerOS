import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type CallRecord = [string, ...unknown[]];

/**
 * Meta Pixel init emits fbq('init', pixelId) and fbq('set', ...) on first
 * load. Filter those — they are not part of the mapped step behavior.
 */
function isInitEffect(call: CallRecord): boolean {
  if (call[0] !== 'fbq') return false;
  const action = call[1];
  return action === 'init' || action === 'set' || action === 'consent';
}

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockFbq = jest.fn();
    const env = clone(examples.env.push);
    env.window.fbq = mockFbq;
    env.window._fbq = mockFbq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { pixelId: '1234567890' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const captured: CallRecord[] = mockFbq.mock.calls
      .map((args) => ['fbq', ...args] as CallRecord)
      .filter((call) => !isInitEffect(call));

    expect(captured).toEqual(example.out);
  });
});
