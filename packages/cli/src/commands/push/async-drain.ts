/**
 * Lightweight timer interception and async drain for CLI simulation.
 *
 * Replaces setTimeout/setInterval on globalThis and an optional JSDOM window
 * with tracked versions that hold callbacks. flush() executes held callbacks
 * and drains microtasks until quiescent.
 */

export interface PendingTimer {
  id: number;
  callback: (...args: unknown[]) => void;
  delay: number;
  type: 'timeout' | 'interval';
  args: unknown[];
  cleared: boolean;
}

export interface TimerControl {
  /** Execute all pending timer callbacks and drain microtasks until quiescent */
  flush(wallTimeout?: number): Promise<void>;
  /** Number of pending (un-cleared) timers */
  countPending(): number;
  /** Restore original timer functions */
  restore(): void;
  /**
   * The shared pending-timer map. Exposed so an external drain pump
   * (`async-drain-pump.ts`) can fire timers while `fn` is awaiting.
   * Mutating this map outside the pump is unsupported.
   */
  pending: Map<number, PendingTimer>;
}

export interface TimerInterceptionOptions {
  /** JSDOM window — patch its timers too (shared pending map) */
  domWindow?: Window & typeof globalThis;
}

interface SavedTimers {
  target: typeof globalThis;
  setTimeout: unknown;
  clearTimeout: unknown;
  setInterval: unknown;
  clearInterval: unknown;
}

export function installTimerInterception(
  options: TimerInterceptionOptions = {},
): TimerControl {
  let nextId = 1;
  const pending = new Map<number, PendingTimer>();

  // Save real timers for microtask drain and restore
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);
  const targets: SavedTimers[] = [];

  // Patches setTimeout/clearTimeout/setInterval/clearInterval on the target.
  // Uses Reflect to read/write properties dynamically. JSDOM's
  // `Window & typeof globalThis` is assignable to `typeof globalThis`.
  function patchTarget(target: typeof globalThis): void {
    targets.push({
      target,
      setTimeout: Reflect.get(target, 'setTimeout'),
      clearTimeout: Reflect.get(target, 'clearTimeout'),
      setInterval: Reflect.get(target, 'setInterval'),
      clearInterval: Reflect.get(target, 'clearInterval'),
    });

    const trackedSetTimeout = (
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): number => {
      if (typeof callback !== 'function') return 0;
      const id = nextId++;
      pending.set(id, {
        id,
        callback,
        delay: delay ?? 0,
        type: 'timeout',
        args,
        cleared: false,
      });
      return id;
    };

    const trackedClear = (id?: unknown): void => {
      if (id == null) return;
      const numId = typeof id === 'number' ? id : Number(id);
      const entry = pending.get(numId);
      if (entry) entry.cleared = true;
    };

    const trackedSetInterval = (
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ): number => {
      if (typeof callback !== 'function') return 0;
      const id = nextId++;
      pending.set(id, {
        id,
        callback,
        delay: delay ?? 0,
        type: 'interval',
        args,
        cleared: false,
      });
      return id;
    };

    Reflect.set(target, 'setTimeout', trackedSetTimeout);
    Reflect.set(target, 'clearTimeout', trackedClear);
    Reflect.set(target, 'setInterval', trackedSetInterval);
    Reflect.set(target, 'clearInterval', trackedClear);
  }

  // Patch globalThis (bare setTimeout in ESM bundles)
  patchTarget(globalThis);

  // Patch JSDOM window if provided and distinct
  if (options.domWindow && options.domWindow !== globalThis) {
    patchTarget(options.domWindow);
  }

  // Yield to real event loop — drains ALL pending microtasks
  const drainMicrotasks = () =>
    new Promise<void>((resolve) => realSetTimeout(resolve, 0));

  async function flush(wallTimeout = 5000): Promise<void> {
    const deadline = Date.now() + wallTimeout;
    const maxIterations = 100;
    let iterations = 0;

    while (iterations < maxIterations) {
      // 1. Drain microtasks (detached Promises that may create timers)
      await drainMicrotasks();

      // 2. Collect non-cleared timers sorted by delay
      const ready = Array.from(pending.values())
        .filter((t) => !t.cleared)
        .sort((a, b) => a.delay - b.delay);

      if (ready.length === 0) break;

      // 3. Execute each timer
      for (const timer of ready) {
        if (timer.cleared) continue; // May have been cleared by a prior callback

        pending.delete(timer.id);

        if (timer.type === 'interval') {
          timer.cleared = true;
          // Re-register for next iteration
          const newId = nextId++;
          pending.set(newId, { ...timer, id: newId, cleared: false });
        }

        try {
          timer.callback(...timer.args);
        } catch (err) {
          // Log but continue — one failure should not break the drain
          console.warn('[async-drain] Timer callback error:', err);
        }
      }

      // 4. Drain microtasks spawned by timer callbacks
      await drainMicrotasks();

      // 5. Wall-clock safety
      if (Date.now() > deadline) {
        break;
      }

      iterations++;
    }

    // Clean up remaining entries (interval leftovers, etc.)
    pending.clear();
  }

  function countPending(): number {
    return Array.from(pending.values()).filter((t) => !t.cleared).length;
  }

  function restore(): void {
    for (const saved of targets) {
      Reflect.set(saved.target, 'setTimeout', saved.setTimeout);
      Reflect.set(saved.target, 'clearTimeout', saved.clearTimeout);
      Reflect.set(saved.target, 'setInterval', saved.setInterval);
      Reflect.set(saved.target, 'clearInterval', saved.clearInterval);
    }
    pending.clear();
  }

  return { flush, countPending, restore, pending };
}
