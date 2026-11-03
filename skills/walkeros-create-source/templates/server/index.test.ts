import type { Collector, WalkerOS } from '@walkeros/core';
import { sourceMySource } from '..';
import { examples } from '../dev';

/**
 * Test template for server sources. The step examples are the tests: each
 * example's request goes through `examples.createTrigger`, and what the source
 * hands the collector is compared with `out`. Never hard-code a request or an
 * event: add it to `examples.step` and read it from there.
 */

/** Starts the source with a terminus that records what it hands over. */
async function trigger(content: unknown) {
  const received: WalkerOS.DeepPartialEvent[] = [];
  // The boundary: the event exactly as the source emits it, before the
  // collector's pipeline (mapping, destinations) runs.
  const terminus: Collector.PushFn = async (event) => {
    received.push(event);
    return { ok: true };
  };

  const instance = await examples.createTrigger({
    sources: { mySource: { code: sourceMySource, terminus } },
  });
  const result = await instance.trigger()(content);
  return { result, received };
}

describe('sourceMySource step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const { received } = await trigger(example.in);

    expect(received.map((event) => ['elb', event])).toEqual(example.out);
  });

  it('answers 400 for a body it cannot read', async () => {
    const { result } = await trigger(examples.step.invalidBody.in);

    expect(result.status).toBe(400);
  });
});
