import { Level, StepError } from '@walkeros/core';
import type { Destination, Logger } from '@walkeros/core';
import { startFlow } from '..';

function capture() {
  const errors: Array<{ message: string; context: Logger.LogContext }> = [];
  const logger: Logger.Config = {
    level: 'DEBUG',
    handler: (level, message, context) => {
      if (level === Level.ERROR) errors.push({ message, context });
    },
  };
  return { errors, logger };
}

const failing: Destination.Instance = {
  type: 'probe',
  config: {},
  push: async () => {
    throw new StepError('vendor said no', {
      code: 'transport',
      status: 503,
      body: { email: 'a@b.c' },
    });
  },
};

describe('outcome sink', () => {
  it('reports a thrown StepError as failed with a reason, DLQ, counter and one ERROR line', async () => {
    const { errors, logger } = capture();
    const { elb, collector } = await startFlow({
      destinations: { probe: { code: failing } },
      logger,
    });
    const r1 = await elb('page view');
    await elb('page view');
    expect(r1.ok).toBe(false);
    expect(r1.failed?.probe.reason).toEqual({
      code: 'transport',
      message: 'vendor said no',
      retryable: true,
      status: 503,
    });
    expect(collector.status.destinations.probe.failed).toBe(2);
    expect(collector.destinations.probe.dlq).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toContain('a@b.c');
  });

  it('flushes the suppressed count through the logger at shutdown', async () => {
    const { errors, logger } = capture();
    const { elb, collector } = await startFlow({
      destinations: { probe: { code: failing } },
      logger,
    });
    expect(collector.causeLog).toBeDefined();
    await elb('page view');
    await elb('page view');
    await elb('walker shutdown');
    expect(errors).toHaveLength(2);
    expect(errors[1].context.suppressed).toBe(1);
  });
});
