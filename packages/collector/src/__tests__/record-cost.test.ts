/**
 * A collector without observers builds no flow record: every record carries
 * an ISO timestamp, so counting `toISOString` counts the records built.
 */
import { startFlow } from '..';

const event = { name: 'page view', data: {} };

describe('flow records', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['without an observer', 0, false],
    ['with an observer', 6, true],
  ])('%s, a push builds %i records', async (_name, records, observe) => {
    const { collector, elb } = await startFlow({
      destinations: {
        sync: { code: { type: 'sync', config: {}, push: () => undefined } },
        batched: {
          code: {
            type: 'batched',
            config: {},
            push: () => undefined,
            pushBatch: () => undefined,
          },
          config: { batch: { wait: 1000 } },
        },
      },
    });
    if (observe) collector.observers.add(() => undefined);
    const iso = jest.spyOn(Date.prototype, 'toISOString');

    await elb(event);

    expect(iso).toHaveBeenCalledTimes(records);
  });
});
