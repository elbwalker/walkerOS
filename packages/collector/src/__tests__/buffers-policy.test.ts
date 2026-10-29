import { Level } from '@walkeros/core';
import type { Collector, Destination, Logger, Source } from '@walkeros/core';
import { startFlow } from '..';

type Line = { level: Level; message: string; context: Logger.LogContext };

function capture() {
  const lines: Line[] = [];
  const logger: Logger.Config = {
    level: 'DEBUG',
    handler: (level, message, context) => {
      lines.push({ level, message, context });
    },
  };
  const at = (level: Level) => lines.filter((line) => line.level === level);
  return { logger, at };
}

function batching(
  pushBatch: Destination.PushBatchFn,
  batch: Destination.Config['batch'] = { wait: 60_000 },
): Destination.Instance {
  return {
    type: 'batcher',
    config: { batch },
    push: jest.fn(),
    pushBatch,
  };
}

describe('buffer policy (design Q4)', () => {
  it('pre-run overflow refuses the newest event: ok false, queue-full, one ERROR', async () => {
    const { at, logger } = capture();
    const { elb, collector } = await startFlow({
      run: false,
      queueMax: 2,
      logger,
    });

    const held = [await elb('page view'), await elb('page view')];
    const refused = await elb('page view');

    for (const r of held) expect(r.ok).toBe(true);
    expect(refused.ok).toBe(false);
    expect(refused.reason).toMatchObject({
      code: 'queue-full',
      retryable: true,
    });
    expect(refused.error).toContain('collector.preRunQueue full');
    expect(collector.preRunQueue).toHaveLength(2);
    expect(at(Level.ERROR)).toHaveLength(1);
    expect(at(Level.ERROR)[0].context.code).toBe('queue-full');
  });

  it('DLQ overflow drops the oldest entry with an ERROR cause line', async () => {
    const { at, logger } = capture();
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: {
            type: 'down',
            config: { dlqMax: 2 },
            push: async () => {
              throw new Error('down');
            },
          },
        },
      },
    });

    await elb('page view');
    await elb('page view');
    await elb('page view');

    expect(collector.destinations.d.dlq).toHaveLength(2);
    expect(collector.status.dropped['destination.d'].dlq).toBe(1);
    const overflow = at(Level.ERROR).filter(
      (line) => line.context.code === 'dlq-overflow',
    );
    expect(overflow).toHaveLength(1);
    expect(overflow[0].message).toContain('status.dropped');
  });

  it('collector.queue overflow is INFO: no present destination loses an event', async () => {
    const { at, logger } = capture();
    const { elb } = await startFlow({ logger, queueMax: 2 });

    await elb('page view');
    await elb('page view');
    await elb('page view');

    expect(at(Level.INFO).map((line) => line.message)).toContain(
      'collector.queue overflow; oldest events dropped',
    );
    expect(at(Level.WARN)).toHaveLength(0);
  });

  it('consent-wait overflow evicts the oldest at DEBUG and counts it (ruling 13)', async () => {
    const { at, logger } = capture();
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: {
            type: 'gated',
            config: { consent: { marketing: true }, queueMax: 1 },
            push: jest.fn(),
          },
        },
      },
    });

    await elb('page view');
    await elb('page view');

    expect(collector.status.dropped['destination.d'].queue).toBe(1);
    expect(
      at(Level.DEBUG).some((line) =>
        line.message.startsWith('destination.queuePush overflow'),
      ),
    ).toBe(true);
    expect(at(Level.WARN)).toHaveLength(0);
  });

  it('batch entries flush at their size, never drop', async () => {
    const sizes: number[] = [];
    const { elb, collector } = await startFlow({
      destinations: {
        d: {
          code: batching(
            async (batch) => {
              sizes.push(batch.entries.length);
            },
            { size: 2, wait: 60_000 },
          ),
        },
      },
    });

    for (let i = 0; i < 5; i++) await elb('page view');
    await elb('walker flush');

    expect(sizes).toEqual([2, 2, 1]);
    expect(collector.status.dropped['destination.d']).toBeUndefined();
  });

  it('invalid input is ERROR through the cause log, once per source per window', async () => {
    const { at, logger } = capture();
    const probe: Source.Init<
      Source.Types<unknown, unknown, Collector.PushFn>
    > = async (context) => ({
      type: 'probe',
      config: context.config,
      push: context.env.push,
    });
    const { elb, collector } = await startFlow({
      logger,
      sources: { probe: { code: probe } },
    });

    const r1 = await elb({ name: 'nospace' });
    const r2 = await elb({ name: 'nospace' });

    expect(r1).toMatchObject({ ok: false, invalid: true });
    expect(r2).toMatchObject({ ok: false, invalid: true });
    expect(collector.status.sources.probe.rejected).toBe(2);
    const errors = at(Level.ERROR);
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toMatchObject({
      step: 'source.probe',
      code: 'invalid',
    });
    expect(errors[0].message).toContain('status.sources.probe.rejected');
    expect(at(Level.WARN)).toHaveLength(0);
  });
});

describe('walker flush (A17)', () => {
  it('delivers a pending batch in one pushBatch and names the destination done', async () => {
    const pushBatch = jest.fn();
    const { elb } = await startFlow({
      destinations: { d: { code: batching(pushBatch) } },
    });
    await elb('page view');
    await elb('page view');
    expect(pushBatch).not.toHaveBeenCalled();

    const r = await elb('walker flush');

    expect(pushBatch).toHaveBeenCalledTimes(1);
    expect(pushBatch.mock.calls[0][0].entries).toHaveLength(2);
    expect(r.ok).toBe(true);
    expect(Object.keys(r.done ?? {})).toEqual(['d']);
  });

  it('with nothing pending answers ok and calls nothing; the collector keeps running', async () => {
    const pushBatch = jest.fn();
    const { elb, collector } = await startFlow({
      destinations: { d: { code: batching(pushBatch) } },
    });

    const idle = await elb('walker flush');
    expect(idle).toEqual({ ok: true });
    expect(pushBatch).not.toHaveBeenCalled();

    const r = await elb('page view');
    expect(r.queued?.d.reason?.code).toBe('batch');
    expect(collector.hasShutdown).toBeFalsy();
    await elb('walker flush');
    expect(pushBatch).toHaveBeenCalledTimes(1);
  });

  it('a failing flush is failed through the outcome sink', async () => {
    const { logger } = capture();
    const { elb, collector } = await startFlow({
      logger,
      destinations: {
        d: {
          code: batching(async () => {
            throw new Error('batch endpoint down');
          }),
        },
      },
    });
    await elb('page view');
    await elb('page view');

    const r = await elb('walker flush');

    expect(r.ok).toBe(false);
    expect(r.failed?.d.reason).toMatchObject({
      code: 'transport',
      message: 'batch endpoint down',
    });
    expect(collector.status.destinations.d.failed).toBe(2);
    expect(collector.destinations.d.dlq).toHaveLength(2);
  });
});
