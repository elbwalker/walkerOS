import { startFlow } from '@walkeros/collector';
import type { Destination, FlowState, WalkerOS } from '@walkeros/core';
import { transformerValidate } from '../transformer';

/**
 * `format: true` through a real collector: the validate transformer runs in a
 * destination's before chain, and only the destination's own push records
 * what arrives (with the ingest it arrives with).
 */
async function deliver(mode: 'pass' | 'strict', user: WalkerOS.User) {
  const received: Array<{ event: WalkerOS.Event; validation: unknown }> = [];
  const states: FlowState[] = [];
  const recorder: Destination.Instance = {
    type: 'recorder',
    config: {},
    push: (event, context) => {
      received.push({ event, validation: context.ingest.validation });
    },
  };
  const { collector, elb } = await startFlow({
    user,
    transformers: {
      validate: {
        code: transformerValidate,
        config: { settings: { format: true, mode } },
      },
    },
    destinations: { recorder: { code: recorder, before: 'validate' } },
  });
  collector.observers.add((state) => states.push(state));
  await elb({ name: 'page view', data: { title: 'Home' } });
  return { received, states };
}

describe('format: true through a real collector', () => {
  it('delivers custom user keys with a valid verdict', async () => {
    const { received } = await deliver('pass', {
      id: 'u1',
      segment: 'vip',
      ltv: 5,
    });

    expect(received).toHaveLength(1);
    const [{ event, validation }] = received;
    expect(event.user).toMatchObject({ id: 'u1', segment: 'vip', ltv: 5 });
    expect(event.source.valid).toBe(true);
    expect(validation).toEqual([]);
  });

  it('pass mode delivers an invalid event with its verdict and errors', async () => {
    const { received } = await deliver('pass', { email: 'not-an-email' });

    expect(received).toHaveLength(1);
    const [{ event, validation }] = received;
    expect(event.source.valid).toBe(false);
    expect(validation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringContaining('/user/email'),
          level: 'error',
        }),
      ]),
    );
  });

  it('strict mode does not deliver an invalid event and reports the skip', async () => {
    const { received, states } = await deliver('strict', {
      email: 'not-an-email',
    });

    expect(received).toHaveLength(0);
    expect(states.filter((state) => state.phase === 'skip')).toEqual([
      expect.objectContaining({
        stepId: 'destination.recorder',
        skipReason: 'dropped',
        meta: { by: 'validate', at: 'destination.recorder.before' },
      }),
    ]);
  });
});
