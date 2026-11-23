/**
 * The runner's measure of its own process: memory against what the process
 * is granted, CPU time and event loop delay, written onto the collector's
 * status, which the collector's usage report carries. CPU time counts up
 * from the process's start and the loop figures from the sampler's, so a
 * period's share is the difference of two records.
 */

import { monitorEventLoopDelay } from 'perf_hooks';
import type { Collector, Logger } from '@walkeros/core';
import { grantedMemoryBytes } from './remote/memory.js';

/** What the sampler reads; Node's own reads unless a test hands others in. */
export interface RuntimeReads {
  /** Resident memory, in bytes. */
  rss(): number;
  /** The memory the process may use, in bytes. */
  granted(): number;
  /** User and system CPU time since the process started, in microseconds. */
  cpu(): { user: number; system: number };
  /** The loop delay histogram: its mean in nanoseconds and its sample count. */
  loop(): { mean: number; count: number };
}

const DEFAULT_INTERVAL_MS = 10_000;

/**
 * The histogram samples the loop once per this many milliseconds, and each
 * sample includes the interval itself, so only what lies above it is delay.
 */
const LOOP_RESOLUTION_MS = 20;

const NS_PER_MS = 1_000_000;

/**
 * Write `status.runtime` now and on every interval until stopped. A read
 * that throws keeps the last record and writes one WARN line per sampler.
 * The timer never keeps the process alive.
 */
export function startRuntimeSampler(
  status: Collector.Status,
  options: {
    intervalMs?: number;
    reads?: RuntimeReads;
    logger: Pick<Logger.Instance, 'warn'>;
  },
): { stop(): void } {
  const { reads, close } = options.reads
    ? { reads: options.reads, close: () => {} }
    : nodeReads();
  let warned = false;

  const sample = (): void => {
    try {
      const cpu = reads.cpu();
      const loop = reads.loop();
      status.runtime = {
        memoryBytes: reads.rss(),
        memoryLimitBytes: reads.granted(),
        cpuMs: Math.round((cpu.user + cpu.system) / 1000),
        loopDelayMs: loopDelayMs(loop),
        loopSamples: loop.count,
      };
    } catch (error) {
      if (warned) return;
      warned = true;
      const message = error instanceof Error ? error.message : String(error);
      options.logger.warn(
        `Runtime sample failed: ${message}; the runtime numbers stay as last sampled`,
      );
    }
  };

  sample();
  const timer = setInterval(
    sample,
    options.intervalMs ?? DEFAULT_INTERVAL_MS,
  ).unref();

  return {
    stop: () => {
      clearInterval(timer);
      close();
    },
  };
}

/** The delay summed over the samples, above the resolution, in ms. */
function loopDelayMs(loop: { mean: number; count: number }): number {
  if (loop.count <= 0) return 0;
  const aboveNs = (loop.mean - LOOP_RESOLUTION_MS * NS_PER_MS) * loop.count;
  return Math.max(0, Math.round(aboveNs / NS_PER_MS));
}

/** Node's reads, over one loop histogram enabled from this call on. */
function nodeReads(): { reads: RuntimeReads; close: () => void } {
  const histogram = monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS });
  histogram.enable();
  return {
    reads: {
      rss: () => process.memoryUsage.rss(),
      granted: () => grantedMemoryBytes(),
      cpu: () => process.cpuUsage(),
      loop: () => ({ mean: histogram.mean, count: histogram.count }),
    },
    close: () => histogram.disable(),
  };
}
