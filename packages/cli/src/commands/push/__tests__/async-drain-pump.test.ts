import type { PendingTimer } from '../async-drain';
import { startDrainPump } from '../async-drain-pump';

let nextId = 1;
function makeTimer(opts: {
  callback: (...args: unknown[]) => void;
  args?: unknown[];
  delay?: number;
  type?: 'timeout' | 'interval';
  cleared?: boolean;
}): PendingTimer {
  return {
    id: nextId++,
    callback: opts.callback,
    args: opts.args ?? [],
    delay: opts.delay ?? 0,
    type: opts.type ?? 'timeout',
    cleared: opts.cleared ?? false,
  };
}

describe('startDrainPump', () => {
  beforeEach(() => {
    nextId = 1;
  });

  it('fires every captured timeout once on the first tick', async () => {
    const calls: string[] = [];
    const pending = new Map<number, PendingTimer>();
    const t1 = makeTimer({ callback: () => calls.push('a') });
    const t2 = makeTimer({ callback: () => calls.push('b') });
    const t3 = makeTimer({ callback: () => calls.push('c') });
    pending.set(t1.id, t1);
    pending.set(t2.id, t2);
    pending.set(t3.id, t3);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();

    expect(calls.sort()).toEqual(['a', 'b', 'c']);
    expect(pending.size).toBe(0);
  });

  it('fires timers in delay-ascending order', async () => {
    const calls: number[] = [];
    const pending = new Map<number, PendingTimer>();
    const slow = makeTimer({ delay: 1000, callback: () => calls.push(1000) });
    const fast = makeTimer({ delay: 10, callback: () => calls.push(10) });
    const mid = makeTimer({ delay: 100, callback: () => calls.push(100) });
    pending.set(slow.id, slow);
    pending.set(fast.id, fast);
    pending.set(mid.id, mid);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();

    expect(calls).toEqual([10, 100, 1000]);
  });

  it('skips cleared entries', async () => {
    const calls: string[] = [];
    const pending = new Map<number, PendingTimer>();
    const live = makeTimer({ callback: () => calls.push('live') });
    const dead = makeTimer({
      callback: () => calls.push('dead'),
      cleared: true,
    });
    pending.set(live.id, live);
    pending.set(dead.id, dead);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();

    expect(calls).toEqual(['live']);
  });

  it('passes captured args to the callback', async () => {
    let received: unknown[] = [];
    const pending = new Map<number, PendingTimer>();
    const t = makeTimer({
      callback: (...args) => {
        received = args;
      },
      args: ['x', 42, { ok: true }],
    });
    pending.set(t.id, t);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();

    expect(received).toEqual(['x', 42, { ok: true }]);
  });

  it('re-registers interval timers after firing (matches flush semantics)', async () => {
    let count = 0;
    const pending = new Map<number, PendingTimer>();
    const interval = makeTimer({
      type: 'interval',
      callback: () => {
        count += 1;
      },
    });
    pending.set(interval.id, interval);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    stop();

    expect(count).toBeGreaterThan(1);
    expect(pending.size).toBeGreaterThan(0); // interval still queued
  });

  it('drains timers added by a fired callback (cascading)', async () => {
    const calls: string[] = [];
    const pending = new Map<number, PendingTimer>();
    const t1 = makeTimer({
      callback: () => {
        calls.push('a');
        const t2 = makeTimer({ callback: () => calls.push('b') });
        pending.set(t2.id, t2);
      },
    });
    pending.set(t1.id, t1);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    stop();

    expect(calls).toEqual(['a', 'b']);
    expect(pending.size).toBe(0);
  });

  it('honors the max-iterations cap', async () => {
    let pumped = 0;
    const pending = new Map<number, PendingTimer>();
    const queueOne = () => {
      const t = makeTimer({
        callback: () => {
          pumped += 1;
          queueOne();
        },
      });
      pending.set(t.id, t);
    };
    queueOne();

    const stop = startDrainPump(pending, { maxIterations: 5 });
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setImmediate(r));
    }
    stop();

    expect(pumped).toBe(5);
  });

  it('honors the wall-clock cap', async () => {
    let pumped = 0;
    const pending = new Map<number, PendingTimer>();
    const queueOne = () => {
      const t = makeTimer({
        callback: () => {
          pumped += 1;
          queueOne();
        },
      });
      pending.set(t.id, t);
    };
    queueOne();

    const stop = startDrainPump(pending, {
      maxIterations: 1_000_000,
      maxWallMs: 50,
    });
    await new Promise((r) => setTimeout(r, 200));
    stop();

    expect(pumped).toBeGreaterThan(0);
    // Wall-clock cap should stop the loop well before any reasonable
    // count for a 50ms window. Even at ~10k iters/sec that gives ~500
    // headroom; we expect the cap to fire well below that ceiling.
    expect(pumped).toBeLessThan(50_000);
  });

  it('continues firing timers after one callback throws', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const calls: string[] = [];
    const pending = new Map<number, PendingTimer>();
    const t1 = makeTimer({
      callback: () => {
        throw new Error('boom');
      },
    });
    const t2 = makeTimer({ callback: () => calls.push('after') });
    pending.set(t1.id, t1);
    pending.set(t2.id, t2);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();

    expect(calls).toEqual(['after']);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('stop() prevents future ticks even if pending grows', async () => {
    const calls: string[] = [];
    const pending = new Map<number, PendingTimer>();
    const t1 = makeTimer({
      callback: () => {
        calls.push('first');
        const t2 = makeTimer({ callback: () => calls.push('second') });
        pending.set(t2.id, t2);
      },
    });
    pending.set(t1.id, t1);

    const stop = startDrainPump(pending);
    await new Promise((r) => setImmediate(r));
    stop();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(calls).toEqual(['first']);
    expect(pending.size).toBe(1); // 'second' was queued but not fired
  });
});
