import type { PendingTimer } from './async-drain.js';

const realSetImmediate = setImmediate;

export interface DrainPumpOptions {
  maxIterations?: number;
  maxWallMs?: number;
}

const DEFAULT_MAX_ITERATIONS = 1000;
const DEFAULT_MAX_WALL_MS = 30_000;

let intervalRequeueCounter = -1;

/**
 * Drain pump for the async-drain timer interception mechanism.
 *
 * The push command patches setTimeout/setInterval on globalThis + JSDOM
 * window to capture deferred work (see `async-drain.ts`). Without a pump,
 * captured timers only run after `fn(flowModule)` resolves (via flush()),
 * which deadlocks when a destination's init awaits one of those captured
 * timers (e.g., `@walkeros/web-destination-amplitude`'s engagement plugin
 * awaits a 10s setTimeout to give up on a CDN script load).
 *
 * This pump runs alongside `fn`, fires every non-cleared captured timer
 * on each tick (sorted by delay ascending to match `flush` ordering),
 * using REAL `setImmediate` saved at module load to avoid any patched
 * version. Re-registers `interval` timers after firing so periodic work
 * keeps cycling — same shape as flush()'s loop. Errors surface via
 * `console.warn` to match the flush contract.
 *
 * Two safety caps: maxIterations (re-pump count) and maxWallMs.
 * Defaults are generous (1000 iters, 30s) — typical destinations queue
 * 1-5 timers during init.
 *
 * Activate ONLY in non-simulate mode; --simulate routes use post-fn flush
 * so snapshot ordering remains stable.
 */
export function startDrainPump(
  pending: Map<number, PendingTimer>,
  options: DrainPumpOptions = {},
): () => void {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxWallMs = options.maxWallMs ?? DEFAULT_MAX_WALL_MS;
  const start = Date.now();
  let running = true;
  let iterations = 0;

  const tick = (): void => {
    if (!running) return;
    if (iterations >= maxIterations) return;
    if (Date.now() - start > maxWallMs) return;

    if (pending.size === 0) {
      realSetImmediate(tick);
      return;
    }

    iterations += 1;

    const snapshot = [...pending.values()]
      .filter((t) => !t.cleared)
      .sort((a, b) => a.delay - b.delay);

    for (const timer of snapshot) {
      pending.delete(timer.id);
      try {
        timer.callback(...timer.args);
      } catch (err) {
        console.warn(`[async-drain] timer ${timer.id} threw during pump:`, err);
      }

      if (timer.type === 'interval' && !timer.cleared) {
        // Re-queue with a fresh id so a single-fire pump cycle catches it
        // again on the next tick. id space is module-scoped negative to
        // avoid colliding with the original setTimeout id counter.
        const requeued: PendingTimer = {
          ...timer,
          id: intervalRequeueCounter--,
        };
        pending.set(requeued.id, requeued);
      }
    }

    realSetImmediate(tick);
  };

  realSetImmediate(tick);

  return () => {
    running = false;
  };
}
