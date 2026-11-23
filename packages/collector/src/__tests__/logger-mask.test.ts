/**
 * A host's mask (a runner's known secret values) reaches the collector's
 * logger and every logger scoped from it, so what leaves outside a log line,
 * an Observe report among it, is masked like a line.
 */
import type { Logger } from '@walkeros/core';
import { startFlow } from '..';

describe('logger mask', () => {
  it('reaches the collector logger and a destination logger', async () => {
    const mask = (text: string) => text.replace('secret-value', '***');
    let destinationLogger: Logger.Instance | undefined;
    const { collector, elb } = await startFlow({
      logger: { mask },
      destinations: {
        d: {
          code: {
            type: 'd',
            config: {},
            init: ({ logger }) => {
              destinationLogger = logger;
            },
            push: () => undefined,
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });

    expect(collector.logger.mask('a secret-value b')).toBe('a *** b');
    expect(destinationLogger?.mask('a secret-value b')).toBe('a *** b');
  });
});
