import { createCauseLog, reportCause } from '../causeLog';

type Line = {
  level: 'error' | 'warn';
  message: string;
  context: Record<string, unknown>;
};

function recorder() {
  const lines: Line[] = [];
  const logger = {
    error(message: string, context: Record<string, unknown>): void {
      lines.push({ level: 'error', message, context });
    },
    warn(message: string, context: Record<string, unknown>): void {
      lines.push({ level: 'warn', message, context });
    },
  };
  return { lines, logger };
}

describe('createCauseLog', () => {
  it('logs the first occurrence, counts repeats in the window, prints suppressed after it', () => {
    let now = 0;
    const { lines, logger } = recorder();
    const log = createCauseLog(logger, { windowMs: 60_000, now: () => now });
    const key = { step: 'destination.ga4', code: 'transport', status: 503 };
    log.report(key, 'Push failed', { event: 'page view' });
    log.report(key, 'Push failed', { event: 'page view' });
    log.report(key, 'Push failed', { event: 'page view' });
    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe('error');
    expect(lines[0].message).toContain('status.destinations.ga4.failed');
    now = 61_000;
    log.report(key, 'Push failed', { event: 'page view' });
    expect(lines).toHaveLength(2);
    expect(lines[1].context.suppressed).toBe(2);
  });

  it('logs every occurrence of a key beyond the 100-key cap, never drops a line', () => {
    const { lines, logger } = recorder();
    const log = createCauseLog(logger, { windowMs: 60_000, now: () => 0 });
    for (let i = 0; i < 100; i++)
      log.report(
        { step: `destination.d${i}`, code: 'transport' },
        'Push failed',
        {},
      );
    expect(lines).toHaveLength(100);
    log.report(
      { step: 'destination.d100', code: 'transport' },
      'Push failed',
      {},
    );
    log.report(
      { step: 'destination.d100', code: 'transport' },
      'Push failed',
      {},
    );
    expect(lines).toHaveLength(102);
    expect(lines[100].context.step).toBe('destination.d100');
    expect(lines[101].context.step).toBe('destination.d100');
    expect(lines[101].context.suppressed).toBeUndefined();
    expect(log.size()).toBe(100);
  });

  it('hands every line, the flushed summary included, to the logger with structured fields', () => {
    const { lines, logger } = recorder();
    const log = createCauseLog(logger, { windowMs: 60_000, now: () => 0 });
    const key = { step: 'destination.ga4', code: 'transport', status: 503 };
    log.report(key, 'Push failed', { event: 'page view', retryable: true });
    log.report(key, 'Push failed', { event: 'page view', retryable: true });
    log.flush();
    log.flush();
    expect(lines).toHaveLength(2);
    expect(lines[0].context).toEqual({
      step: 'destination.ga4',
      code: 'transport',
      status: 503,
      event: 'page view',
      retryable: true,
    });
    expect(lines[1].context).toMatchObject({
      step: 'destination.ga4',
      code: 'transport',
      status: 503,
      suppressed: 1,
    });
  });

  it('reduces an event to its name and drops every payload key', () => {
    const { lines, logger } = recorder();
    const log = createCauseLog(logger, { windowMs: 60_000, now: () => 0 });
    const fullEvent = {
      name: 'order complete',
      data: { email: 'a@b.c' },
      user: { id: 'user-1' },
      globals: { pagegroup: 'checkout' },
    };
    log.report({ step: 'destination.d', code: 'mapping' }, 'mapping failed', {
      event: fullEvent,
      data: { email: 'a@b.c' },
      ingest: { ip: '127.0.0.1' },
    });
    expect(lines[0].context.event).toBe('order complete');
    const text = JSON.stringify(lines);
    expect(text).not.toContain('a@b.c');
    expect(text).not.toContain('user-1');
    expect(text).not.toContain('checkout');
    expect(text).not.toContain('127.0.0.1');
  });

  it('writes a WARN cause through warn, rate limited the same way', () => {
    const { lines, logger } = recorder();
    const log = createCauseLog(logger, { windowMs: 60_000, now: () => 0 });
    const key = { step: 'source.express', code: 'invalid' };
    log.report(key, 'invalid event rejected', {}, 'warn');
    log.report(key, 'invalid event rejected', {}, 'warn');
    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe('warn');
    expect(lines[0].message).toContain('status.sources.express.rejected');
  });
});

describe('reportCause', () => {
  it('writes one filtered line through the logger when the collector has no cause log', () => {
    const { lines, logger } = recorder();
    reportCause(
      undefined,
      logger,
      { step: 'store.s', code: 'transport', status: 403 },
      'store read failed',
      { error: new Error('HTTP 403'), data: { email: 'a@b.c' } },
    );
    expect(lines).toEqual([
      {
        level: 'error',
        message: 'store read failed',
        context: {
          step: 'store.s',
          code: 'transport',
          status: 403,
          error: 'HTTP 403',
        },
      },
    ]);
  });
});
