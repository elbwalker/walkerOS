import { Level } from '@walkeros/core';
import type { Destination, Logger, On } from '@walkeros/core';
import { startFlow } from '..';

/** A destination with `on` and no `init`, recording every delivery. */
function recorder(config: Destination.Config = {}) {
  const calls: Array<{ type: On.Types; data: unknown }> = [];
  const destination: Destination.Instance = {
    type: 'recorder',
    config,
    on: (type, context) => {
      calls.push({ type, data: context.data });
    },
    push: jest.fn(),
  };
  return { calls, destination };
}

function errors() {
  const lines: string[] = [];
  const logger: Logger.Config = {
    handler: (level, message) => {
      if (level === Level.ERROR) lines.push(message);
    },
  };
  return { lines, logger };
}

describe('on() without init', () => {
  it('(a) receives on(consent) after a consent command; queueOn drains (B3)', async () => {
    const { calls, destination } = recorder();
    const { elb, collector } = await startFlow({
      destinations: { d: { code: destination } },
    });

    await elb('walker consent', { marketing: true });

    expect(calls.map((call) => call.type)).toContain('consent');
    expect(collector.destinations.d.queueOn ?? []).toHaveLength(0);
    expect(collector.destinations.d.config.init).toBe(true);
  });

  it('(b) a consent-gated destination gets no state before the grant, then all of it in order', async () => {
    const { calls, destination } = recorder({ consent: { marketing: true } });
    const { elb } = await startFlow({
      destinations: { d: { code: destination } },
    });

    await elb('walker user', { id: 'u1' });
    await elb('walker globals', { pagegroup: 'docs' });
    expect(calls).toHaveLength(0);

    await elb('walker consent', { marketing: true });

    expect(
      calls
        .map((call) => call.type)
        .filter((type) => type === 'user' || type === 'globals'),
    ).toEqual(['user', 'globals']);
  });

  it('(c) state deliveries coalesce per type while waiting: one entry, the latest value', async () => {
    const { lines, logger } = errors();
    const { calls, destination } = recorder({ consent: { marketing: true } });
    const { elb, collector } = await startFlow({
      logger,
      destinations: { d: { code: destination } },
    });

    for (let i = 0; i < 50; i++) await elb('walker user', { id: `u${i}` });

    const queued = collector.destinations.d.queueOn ?? [];
    expect(queued.filter((entry) => entry.type === 'user')).toEqual([
      { type: 'user', data: { id: 'u49' } },
    ]);

    await elb('walker consent', { marketing: true });

    const userCalls = calls.filter((call) => call.type === 'user');
    expect(userCalls).toEqual([{ type: 'user', data: { id: 'u49' } }]);
    expect(lines).toHaveLength(0);
    expect(collector.status.dropped['destination.d']).toBeUndefined();
  });

  it('(d) lifecycle deliveries beyond queueMax drop the oldest with one ERROR', async () => {
    const { lines, logger } = errors();
    const { destination } = recorder({
      consent: { marketing: true },
      queueMax: 2,
    });
    const { elb, collector } = await startFlow({
      logger,
      destinations: { d: { code: destination } },
    });

    // The run delivery is queued already; three session deliveries follow.
    await elb('walker session');
    await elb('walker session');
    await elb('walker session');

    expect(collector.destinations.d.queueOn).toHaveLength(2);
    expect(collector.status.dropped['destination.d'].queue).toBe(2);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('destination.queueOn full (queueMax 2)');
  });
});
