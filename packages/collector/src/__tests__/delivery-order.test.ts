import type { Collector, Destination, Elb, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

/** A push's answer, or `'hang'` when it has not answered after many turns. */
async function within(
  push: Promise<Elb.PushResult>,
): Promise<Elb.PushResult | 'hang'> {
  let answer: Elb.PushResult | undefined;
  void push.then((result) => {
    answer = result;
  });
  for (let turn = 0; turn < 1000 && !answer; turn++) await Promise.resolve();
  return answer ?? 'hang';
}

/** A consent-gated destination whose init takes several turns. */
async function gatedFlow(consentDenied: 'skip' | 'queue') {
  const names: string[] = [];
  const destination: Destination.Instance = {
    type: 'gated',
    config: { consent: { marketing: true } },
    init: async () => {
      for (let turn = 0; turn < 10; turn++) await Promise.resolve();
    },
    push: (event: WalkerOS.Event) => {
      names.push(event.name);
    },
  };
  const { collector } = await startFlow({
    consentDenied,
    logger: { handler: () => undefined },
    destinations: { d: { code: destination } },
  });
  return { collector, names };
}

const pushWith = (
  collector: Collector.Instance,
  name: string,
  marketing: boolean,
) => within(collector.push({ name, consent: { marketing } }));

describe('delivery order across a destination init', () => {
  it('delivers events pushed without awaiting in push order to a destination without init', async () => {
    const names: string[] = [];
    const destination: Destination.Instance = {
      type: 'recorder',
      config: {},
      push: (event: WalkerOS.Event) => {
        names.push(event.name);
      },
    };
    const { elb } = await startFlow({
      destinations: { recorder: { code: destination } },
    });

    await Promise.all([elb('a one'), elb('b two'), elb('c three')]);

    expect(names).toEqual(['a one', 'b two', 'c three']);
  });

  it('keeps push order behind an async init; a push behind it answers once its event was delivered', async () => {
    const names: string[] = [];
    const destination: Destination.Instance = {
      type: 'recorder',
      config: {},
      init: async () => {
        // Several turns, so later pushes arrive while it runs.
        for (let turn = 0; turn < 10; turn++) await Promise.resolve();
      },
      push: (event: WalkerOS.Event) => {
        names.push(event.name);
      },
    };
    const { elb } = await startFlow({
      destinations: { recorder: { code: destination } },
    });

    // What the destination had received when each push answered.
    const answered = (name: string) =>
      elb(name).then((result) => ({ result, seen: [...names] }));
    const [a, b, c] = await Promise.all([
      answered('a one'),
      answered('b two'),
      answered('c three'),
    ]);

    expect(names).toEqual(['a one', 'b two', 'c three']);
    for (const [push, name] of [
      [a, 'a one'],
      [b, 'b two'],
      [c, 'c three'],
    ] as const) {
      expect(push.seen).toContain(name);
      expect(push.result.ok).toBe(true);
      expect(push.result.done?.recorder).toBeDefined();
      expect(push.result.queued).toBeUndefined();
    }
  });

  it('fails the events queued behind an init that fails, never leaves them waiting', async () => {
    const destination: Destination.Instance = {
      type: 'broken',
      config: {},
      init: async () => {
        for (let turn = 0; turn < 10; turn++) await Promise.resolve();
        throw new Error('init failed');
      },
      push: jest.fn(),
    };
    const { elb, collector } = await startFlow({
      logger: { handler: () => undefined },
      destinations: { broken: { code: destination } },
    });

    const results = await Promise.all([
      elb('a one'),
      elb('b two'),
      elb('c three'),
    ]);

    // Every push, the ones queued behind the init too, answers the init's
    // failure: none is acknowledged before its event was tried.
    for (const result of results) {
      expect(result.ok).toBe(false);
      expect(result.failed?.broken.reason).toMatchObject({
        code: 'transport',
        message: 'init failed',
      });
    }
    expect(collector.status.destinations.broken.failed).toBe(3);
    expect(collector.destinations.broken.queuePush ?? []).toHaveLength(0);
    expect(
      (collector.destinations.broken.dlq ?? []).map(([event]) => event.name),
    ).toEqual(['a one', 'b two', 'c three']);
  });

  it.each<['skip' | 'queue']>([['skip'], ['queue']])(
    'consentDenied %s: pushes behind the init keep their own event consent, all answer and are delivered in order',
    async (mode) => {
      const { collector, names } = await gatedFlow(mode);

      const results = await Promise.all([
        pushWith(collector, 'a one', true),
        pushWith(collector, 'b two', true),
        pushWith(collector, 'c three', true),
      ]);

      expect(names).toEqual(['a one', 'b two', 'c three']);
      for (const result of results) {
        expect(result).not.toBe('hang');
        if (result === 'hang') continue;
        expect(result.ok).toBe(true);
        expect(result.done?.d).toBeDefined();
      }
    },
  );

  it.each<['skip' | 'queue']>([['skip'], ['queue']])(
    'consentDenied %s: a push whose own consent is denied answers at once, the others are delivered',
    async (mode) => {
      const { collector, names } = await gatedFlow(mode);

      const [a, b, c] = await Promise.all([
        pushWith(collector, 'a one', true),
        pushWith(collector, 'b two', false),
        pushWith(collector, 'c three', true),
      ]);

      expect(names).toEqual(['a one', 'c three']);
      for (const result of [a, c]) expect(result).not.toBe('hang');
      expect(b).not.toBe('hang');
      if (b === 'hang') return;
      expect(b.ok).toBe(true);
      expect(b.done).toBeUndefined();
      if (mode === 'skip') {
        expect(b.queued).toBeUndefined();
        expect(collector.status.destinations.d.skipped).toBe(1);
      } else {
        expect(b.queued?.d.reason?.code).toBe('consent');
      }
    },
  );
});
