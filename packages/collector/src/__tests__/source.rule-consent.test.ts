// A source applies a matched rule's `consent` the way it applies its own
// `config.consent`: a denied event is dropped before it reaches the collector,
// recorded with the requirement that was not met and, for a rule, its key.

import type { FlowState, Mapping } from '@walkeros/core';
import { startFlow } from '..';

async function flow(mapping: Mapping.Config) {
  const states: FlowState[] = [];
  const received: string[] = [];
  const { collector } = await startFlow({
    run: true,
    consent: { analytics: true },
    destinations: {
      d: {
        code: {
          type: 'd',
          config: {},
          push: async (event) => {
            received.push(event.name);
          },
        },
      },
    },
  });
  collector.observers.add((state) => states.push(state));
  const push = (name: string) =>
    collector.push({ name, data: {} }, { id: 's', mapping });
  return { states, received, push };
}

it('drops a source event whose rule consent is denied, recorded with the rule key', async () => {
  const { states, received, push } = await flow({
    consent: { analytics: true },
    mapping: { order: { complete: { consent: { marketing: true } } } },
  });
  const result = await push('order complete');
  await push('page view');
  expect(result).toEqual(expect.objectContaining({ ok: true, dropped: true }));
  expect(received).toEqual(['page view']);
  const drop = states.find(
    (s) => s.phase === 'skip' && s.skipReason === 'consent',
  );
  expect(drop?.meta).toEqual({ at: 'source.s', required: { marketing: true } });
  expect(drop?.mappingKey).toBe('order complete');
});

it('keeps the source config.consent record unchanged', async () => {
  const { states, push } = await flow({ consent: { marketing: true } });
  await push('page view');
  const drop = states.find((s) => s.skipReason === 'consent');
  expect(drop?.meta).toEqual({ at: 'source.s', required: { marketing: true } });
  expect(drop?.mappingKey).toBeUndefined();
});
