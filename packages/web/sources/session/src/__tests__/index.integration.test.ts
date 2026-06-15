import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import { sourceSession } from '../index';

// Back web-core storage with an in-memory map so the session source's
// storageRead/storageWrite genuinely persist between consent grants. This is
// what makes the granted-then-granted-again idempotency real: the first grant
// writes a session, the second reads it back and sees isStart=false.
jest.mock('@walkeros/web-core', () => {
  const store = new Map<string, string>();
  return {
    ...jest.requireActual('@walkeros/web-core'),
    storageRead: jest.fn((key: string) => store.get(key)),
    storageWrite: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    __store: store,
  };
});

const webCore = jest.requireMock('@walkeros/web-core') as {
  __store: Map<string, string>;
};

/**
 * Count how many `session start` events reached the capture destination.
 */
function sessionStartCount(events: WalkerOS.Event[]): number {
  return events.filter((event) => event.name === 'session start').length;
}

/**
 * Wire the REAL session source into a REAL collector with a capture
 * destination. The destination has no `config.consent`, so it receives every
 * pushed event; the assertions count `session start` receipts directly.
 *
 * `run` controls whether the collector is allowed before consent is granted.
 */
async function startSessionFlow(options: {
  run: boolean;
  captured: WalkerOS.Event[];
}): Promise<Collector.Instance> {
  const { collector } = await startFlow({
    run: options.run,
    sources: {
      session: {
        code: sourceSession,
        config: {
          settings: {
            consent: 'marketing',
            // Same-domain referrer + no marketing params: the window-only
            // (consent-denied) path detects NO session start. The storage path
            // (chosen on grant) starts a session on first visit because the
            // backing store is empty, then persists it for idempotency.
            url: 'https://example.com/',
            referrer: 'https://example.com/',
          },
        },
      },
    },
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: (event: WalkerOS.Event): void => {
            options.captured.push(event);
          },
        },
      },
    },
  });

  return collector;
}

describe('Session Source: collector-enforced exactly-once (I12)', () => {
  beforeEach(() => {
    webCore.__store.clear();

    // jsdom: a fresh navigate entry so sessionWindow treats this as a visit.
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
      configurable: true,
    });
  });

  test('consent granted before run: exactly one session start after run', async () => {
    const captured: WalkerOS.Event[] = [];

    // Pre-run: collector is not allowed yet, so the consent grant is deferred.
    const collector = await startSessionFlow({ run: false, captured });

    await collector.command('consent', { marketing: true });

    // Nothing delivered while !allowed.
    expect(sessionStartCount(captured)).toBe(0);

    // Run: the owed consent rule is re-delivered exactly once.
    await collector.command('run');

    expect(sessionStartCount(captured)).toBe(1);
  });

  test('denied then granted: exactly one session start on the grant', async () => {
    const captured: WalkerOS.Event[] = [];

    // Post-run (allowed). A denied grant must not start a session.
    const collector = await startSessionFlow({ run: true, captured });

    await collector.command('consent', { marketing: false });
    expect(sessionStartCount(captured)).toBe(0);

    // The grant flips the single registered rule once.
    await collector.command('consent', { marketing: true });
    expect(sessionStartCount(captured)).toBe(1);
  });

  test('granted then granted again (same value): exactly one session start total', async () => {
    const captured: WalkerOS.Event[] = [];

    const collector = await startSessionFlow({ run: true, captured });

    // First grant: storage is empty, so the session starts (isStart=true).
    await collector.command('consent', { marketing: true });
    expect(sessionStartCount(captured)).toBe(1);

    // Second identical grant bumps stateVersion again, so the rule is
    // delivered a second time, but storage idempotency makes the callback see
    // isStart=false (the session was written on the first grant). No second
    // `session start`.
    await collector.command('consent', { marketing: true });
    expect(sessionStartCount(captured)).toBe(1);
  });
});

describe('Session Source: ungated path respects run', () => {
  beforeEach(() => {
    webCore.__store.clear();

    // jsdom: a fresh navigate entry so the storage path treats this as a visit.
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
      configurable: true,
    });
  });

  // No `consent` setting: the source has no consent rule to replay at the run
  // barrier. The emit must instead wait for the run lifecycle, otherwise the
  // `session start` pushed during init() (while !allowed) is dropped at the
  // dormant destination gate and never delivered.
  async function startUngatedFlow(options: {
    run: boolean;
    captured: WalkerOS.Event[];
  }): Promise<Collector.Instance> {
    const { collector } = await startFlow({
      run: options.run,
      sources: {
        session: {
          code: sourceSession,
          config: { settings: { storage: true } },
        },
      },
      destinations: {
        capture: {
          code: {
            type: 'capture',
            config: {},
            push: (event: WalkerOS.Event): void => {
              options.captured.push(event);
            },
          },
        },
      },
    });

    return collector;
  }

  test('run:false — session start is delivered at run, not dropped pre-run', async () => {
    const captured: WalkerOS.Event[] = [];
    const collector = await startUngatedFlow({ run: false, captured });

    // Pre-run: collector is not allowed yet, so nothing is delivered.
    expect(sessionStartCount(captured)).toBe(0);

    await collector.command('run');

    // The ungated emit lands in the now-allowed pipeline exactly once.
    expect(sessionStartCount(captured)).toBe(1);
  });

  test('run:true — session start is delivered exactly once at startup run', async () => {
    const captured: WalkerOS.Event[] = [];
    await startUngatedFlow({ run: true, captured });

    expect(sessionStartCount(captured)).toBe(1);
  });
});
