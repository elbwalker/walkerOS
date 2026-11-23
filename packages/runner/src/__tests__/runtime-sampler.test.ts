import type { Collector, Logger } from '@walkeros/core';
import { startRuntimeSampler, type RuntimeReads } from '../runtime-sampler.js';

function emptyStatus(): Collector.Status {
  return {
    startedAt: 0,
    in: 0,
    out: 0,
    failed: 0,
    sources: {},
    destinations: {},
    dropped: {},
    breakers: {},
    connectionErrors: {},
  };
}

/** Reads that answer the given values, the same on every call. */
function fixedReads(
  values: {
    rss?: number;
    granted?: number;
    cpu?: { user: number; system: number };
    loop?: { mean: number; count: number };
  } = {},
): RuntimeReads {
  return {
    rss: () => values.rss ?? 100,
    granted: () => values.granted ?? 400,
    cpu: () => values.cpu ?? { user: 0, system: 0 },
    loop: () => values.loop ?? { mean: 20_000_000, count: 0 },
  };
}

/** Reads whose figures count up by one per sample, each on its own. */
function countingReads(): RuntimeReads {
  let rss = 0;
  let cpu = 0;
  let loop = 0;
  return {
    rss: () => ++rss,
    granted: () => 400,
    cpu: () => ({ user: ++cpu * 1000, system: 0 }),
    loop: () => ({ mean: 21_000_000, count: ++loop }),
  };
}

/** For the tests that read no WARN line. */
const quiet: Pick<Logger.Instance, 'warn'> = { warn: () => {} };

function warnings(): {
  logger: Pick<Logger.Instance, 'warn'>;
  lines: unknown[];
} {
  const lines: unknown[] = [];
  return {
    lines,
    logger: {
      warn: (message) => {
        lines.push(message);
      },
    },
  };
}

describe('startRuntimeSampler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('writes the record at start and every 10 s', () => {
    const status = emptyStatus();
    const sampler = startRuntimeSampler(status, {
      reads: countingReads(),
      logger: quiet,
    });

    expect(status.runtime?.memoryBytes).toBe(1);
    jest.advanceTimersByTime(9_999);
    expect(status.runtime?.memoryBytes).toBe(1);
    jest.advanceTimersByTime(1);
    expect(status.runtime).toEqual({
      memoryBytes: 2,
      memoryLimitBytes: 400,
      cpuMs: 2,
      loopDelayMs: 2,
      loopSamples: 2,
    });

    sampler.stop();
  });

  it.each<[string, Parameters<typeof fixedReads>[0], Collector.RuntimeStatus]>([
    [
      'derives cpu and loop numbers',
      {
        rss: 100,
        granted: 400,
        cpu: { user: 1_500_000, system: 500_000 },
        loop: { mean: 21_000_000, count: 500 },
      },
      {
        memoryBytes: 100,
        memoryLimitBytes: 400,
        cpuMs: 2000,
        loopDelayMs: 500,
        loopSamples: 500,
      },
    ],
    [
      'writes 0 and 0 for a histogram with no sample',
      { loop: { mean: NaN, count: 0 } },
      {
        memoryBytes: 100,
        memoryLimitBytes: 400,
        cpuMs: 0,
        loopDelayMs: 0,
        loopSamples: 0,
      },
    ],
    [
      'writes no negative delay for a mean under the resolution',
      { loop: { mean: 19_600_000, count: 50 } },
      {
        memoryBytes: 100,
        memoryLimitBytes: 400,
        cpuMs: 0,
        loopDelayMs: 0,
        loopSamples: 50,
      },
    ],
    [
      'rounds to whole milliseconds',
      {
        cpu: { user: 1_000_600, system: 0 },
        loop: { mean: 20_500_000, count: 3 },
      },
      {
        memoryBytes: 100,
        memoryLimitBytes: 400,
        cpuMs: 1001,
        loopDelayMs: 2,
        loopSamples: 3,
      },
    ],
  ])('%s', (_case, values, record) => {
    const status = emptyStatus();
    const sampler = startRuntimeSampler(status, {
      reads: fixedReads(values),
      logger: quiet,
    });

    expect(status.runtime).toEqual(record);

    sampler.stop();
  });

  it('keeps the last record and warns once when a read throws', () => {
    const status = emptyStatus();
    let calls = 0;
    const reads: RuntimeReads = {
      ...fixedReads(),
      rss: () => {
        calls++;
        if (calls === 2 || calls === 3) throw new Error('rss unreadable');
        return calls * 100;
      },
    };
    const { logger, lines } = warnings();
    const sampler = startRuntimeSampler(status, { reads, logger });
    const first = status.runtime;

    jest.advanceTimersByTime(20_000);
    expect(status.runtime).toBe(first);
    expect(status.runtime?.memoryBytes).toBe(100);

    jest.advanceTimersByTime(10_000);
    expect(status.runtime?.memoryBytes).toBe(400);
    expect(lines).toEqual([
      'Runtime sample failed: rss unreadable; the runtime numbers stay as last sampled',
    ]);

    sampler.stop();
  });

  it('stops', () => {
    const status = emptyStatus();
    const sampler = startRuntimeSampler(status, {
      reads: countingReads(),
      logger: quiet,
    });

    sampler.stop();
    jest.advanceTimersByTime(30_000);

    expect(status.runtime?.memoryBytes).toBe(1);
  });
});
