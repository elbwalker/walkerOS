import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

/**
 * A destination that records the order of its lifecycle calls: init, on(type)
 * with the delivered data, and push(event name). Modeled on the gtag
 * destination, whose on('consent') writes the Consent Mode update that must
 * land before the first push. Consent-gated on marketing unless overridden.
 */
function recorder(
  log: string[],
  config: Destination.Config = { consent: { marketing: true } },
  // Lifecycle types are noise in an ordering test about state: every
  // destination initialized before the collector broadcasts `run` records a
  // live `on:run`, which is correct behaviour and would appear in most
  // expectations below without saying anything about consent. The tests that
  // do assert lifecycle delivery pass `true` and record every type.
  lifecycle = false,
): Destination.Init {
  const code: Destination.Instance = {
    type: 'recorder',
    config: {},
    init: () => {
      log.push('init');
    },
    push: (event: WalkerOS.Event) => {
      log.push(`push:${event.name}`);
    },
    on: (type, context) => {
      const stateCell =
        type === 'consent' ||
        type === 'user' ||
        type === 'globals' ||
        type === 'custom';
      if (!stateCell && !lifecycle) return;
      const data = context.data;
      log.push(
        data === undefined
          ? `on:${type}`
          : `on:${type}:${JSON.stringify(data)}`,
      );
    },
  };
  return { code, config };
}

const GRANT = 'on:consent:{"marketing":true}';

describe('destination on(consent) precedes the first push (repro variants)', () => {
  test('require + consent + event: the activated destination receives the consent before its queued event', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb(
      'walker destination',
      recorder(log, {
        id: 'rec',
        consent: { marketing: true },
        require: ['consent'],
      }),
    );
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('require + consent without an event: the grant initializes the destination and delivers the consent', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb(
      'walker destination',
      recorder(log, {
        id: 'rec',
        consent: { marketing: true },
        require: ['consent'],
      }),
    );
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT]);
  });

  test('consent + event without require keeps the correct order', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb(
      'walker destination',
      recorder(log, { id: 'rec', consent: { marketing: true } }),
    );
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('a second grant is delivered once more, after the push it can no longer affect', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({});
    await elb(
      'walker destination',
      recorder(log, {
        id: 'rec',
        consent: { marketing: true },
        require: ['consent'],
      }),
    );
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT, 'push:page view', GRANT]);
  });

  test('startup require + consent + event (flow config shape) delivers the consent before the queued event', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: {
        rec: recorder(log, {
          consent: { marketing: true },
          require: ['consent'],
        }),
      },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('startup consent + event without require keeps the correct order', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      destinations: { rec: recorder(log) },
    });
    await elb('page view', {});
    await elb('walker consent', { marketing: true });
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });
});

describe('destination on(consent) precedes the first push (further activation paths)', () => {
  test('a destination added at runtime after consent was recorded catches up before its first push', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({ consent: { marketing: true } });
    await elb(
      'walker destination',
      recorder(log, { id: 'rec', consent: { marketing: true } }),
    );
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('consent passed as walker run state reaches on() before the first push', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({
      run: false,
      destinations: { rec: recorder(log) },
    });
    await collector.command('run', { consent: { marketing: true } });
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('initial consent plus a startup require gate delivers the consent exactly once, before the first push', async () => {
    const log: string[] = [];
    const { elb } = await startFlow({
      consent: { marketing: true },
      destinations: {
        rec: recorder(log, {
          consent: { marketing: true },
          require: ['consent'],
        }),
      },
    });
    await elb('page view', {});
    expect(log).toEqual(['init', GRANT, 'push:page view']);
  });

  test('a denial satisfies require without initializing; the later grant is delivered before the queued event', async () => {
    const log: string[] = [];
    const { elb, collector } = await startFlow({});
    await elb(
      'walker destination',
      recorder(log, {
        id: 'rec',
        consent: { marketing: true },
        require: ['consent'],
      }),
    );
    await elb('walker consent', { marketing: false });
    await elb('page view', {});
    expect(collector.destinations.rec).toBeDefined();
    expect(log).toEqual([]);
    await elb('walker consent', { marketing: true });
    // The denied snapshot delivered at activation stays in queueOn and is
    // replayed in FIFO order at init; order is preserved, nothing collapsed.
    expect(log).toEqual([
      'init',
      'on:consent:{"marketing":false}',
      GRANT,
      'push:page view',
    ]);
  });
});
