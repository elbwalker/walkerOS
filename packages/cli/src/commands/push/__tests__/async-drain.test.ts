import { installTimerInterception } from '../async-drain';

describe('async-drain', () => {
  let control: ReturnType<typeof installTimerInterception>;
  let realTimerHops: jest.SpyInstance | undefined;

  afterEach(() => {
    // Always restore even if test fails. Order matters: restore() writes the
    // saved reference back onto globalThis, and when a test wrapped the global
    // first that saved reference is the spy, so the spy has to be unwound after.
    control?.restore();
    realTimerHops?.mockRestore();
    realTimerHops = undefined;
  });

  /**
   * Count the real-timer hops `flush()` performs.
   *
   * `installTimerInterception` captures `globalThis.setTimeout` at install time
   * and uses it for its microtask drains, so the spy has to be in place BEFORE
   * the interception is installed to sit on that path.
   */
  const countRealTimerHops = (): jest.SpyInstance => {
    realTimerHops = jest.spyOn(globalThis, 'setTimeout');
    return realTimerHops;
  };

  it('intercepts setTimeout and holds callback', () => {
    control = installTimerInterception();
    const fn = jest.fn();
    setTimeout(fn, 100);
    expect(fn).not.toHaveBeenCalled();
    expect(control.countPending()).toBe(1);
  });

  it('flush executes pending timeout callbacks', async () => {
    control = installTimerInterception();
    const results: string[] = [];
    setTimeout(() => results.push('a'), 100);
    setTimeout(() => results.push('b'), 50);

    await control.flush();

    // Both executed, shorter delay first
    expect(results).toEqual(['b', 'a']);
    expect(control.countPending()).toBe(0);
  });

  it('clearTimeout prevents callback from firing', async () => {
    control = installTimerInterception();
    const fn = jest.fn();
    const id = setTimeout(fn, 100);
    clearTimeout(id);

    await control.flush();

    expect(fn).not.toHaveBeenCalled();
  });

  it('clearTimeout during flush prevents later callback', async () => {
    control = installTimerInterception();
    const fn1 = jest.fn();
    const id1 = setTimeout(fn1, 100);
    setTimeout(() => clearTimeout(id1), 10); // shorter delay, clears fn1

    await control.flush();

    expect(fn1).not.toHaveBeenCalled();
  });

  it('flushes detached Promise chains (microtask drain)', async () => {
    control = installTimerInterception();
    const results: string[] = [];

    // Detached Promise — like triggerClick calling handleTrigger without await
    Promise.resolve()
      .then(() => results.push('micro1'))
      .then(() => results.push('micro2'));

    await control.flush();

    expect(results).toEqual(['micro1', 'micro2']);
  });

  it('flushes debounced callbacks (setTimeout from Promise chain)', async () => {
    control = installTimerInterception();
    const results: string[] = [];

    // Promise creates a timer (like debounce inside collector.push)
    Promise.resolve().then(() => {
      setTimeout(() => results.push('debounced'), 1000);
    });

    await control.flush();

    expect(results).toEqual(['debounced']);
  });

  it('handles nested timers (timer callback creates new timer)', async () => {
    control = installTimerInterception();
    const results: string[] = [];

    setTimeout(() => {
      results.push('outer');
      setTimeout(() => results.push('inner'), 50);
    }, 100);

    await control.flush();

    expect(results).toEqual(['outer', 'inner']);
  });

  it('handles setInterval — fires and re-registers', async () => {
    control = installTimerInterception();
    let count = 0;
    setInterval(() => count++, 100);

    await control.flush();

    // Fires at least once (limited by maxIterations)
    expect(count).toBeGreaterThan(0);
    // Cleaned up after flush
    expect(control.countPending()).toBe(0);
  });

  it('clearInterval stops interval', async () => {
    control = installTimerInterception();
    let count = 0;
    const id = setInterval(() => count++, 100);
    clearInterval(id);

    await control.flush();

    expect(count).toBe(0);
  });

  it('error in callback does not break drain', async () => {
    control = installTimerInterception();
    const results: string[] = [];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    setTimeout(() => {
      throw new Error('boom');
    }, 10);
    setTimeout(() => results.push('ok'), 20);

    await control.flush();

    expect(results).toEqual(['ok']);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns after a single drain when no pending work', async () => {
    // "Returns immediately" means one microtask drain and no timer loop, which
    // is a hop count, not a duration: the wall-clock cost of one setTimeout(0)
    // belongs to the machine, and on a loaded CI box it comfortably exceeds the
    // 100ms this used to assert. Counting hops states the invariant directly
    // and is immune to load.
    const hops = countRealTimerHops();
    control = installTimerInterception();
    hops.mockClear();

    await control.flush();

    expect(hops).toHaveBeenCalledTimes(1);
    expect(control.countPending()).toBe(0);
  });

  it('restore brings back real timers', async () => {
    const realSetTimeout = globalThis.setTimeout;
    control = installTimerInterception();
    expect(globalThis.setTimeout).not.toBe(realSetTimeout);

    control.restore();
    expect(globalThis.setTimeout).toBe(realSetTimeout);

    // Real setTimeout actually works
    const result = await new Promise<string>((resolve) => {
      setTimeout(() => resolve('real'), 1);
    });
    expect(result).toBe('real');
  });

  it('mixed: detached Promise triggers debounced timer', async () => {
    control = installTimerInterception();
    const results: string[] = [];

    // Simulates: click handler (fire-and-forget) → collector.push → destinationPush → debounce
    const debouncedFn = () => {
      // clearTimeout + setTimeout pattern from debounce
      setTimeout(() => results.push('batch-sent'), 1000);
    };

    Promise.resolve()
      .then(() => results.push('event-captured'))
      .then(() => debouncedFn());

    await control.flush();

    expect(results).toEqual(['event-captured', 'batch-sent']);
  });
});
