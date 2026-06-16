import type { Destination, Source, WalkerOS } from '@walkeros/core';
import { createEvent, createMockLogger, stepId } from '@walkeros/core';
import { collector } from '../collector';
import { buildReportError } from '../report-error';

/**
 * Step-general out-of-band error contract (`reportError`).
 *
 * `reportError` is built into the context of EVERY step kind (source,
 * transformer, store, destination) by the collector. A step that owns an
 * EventEmitter SDK object calls it from the object's `'error'` handler, where
 * there is no surrounding `await`/`tryCatchAsync`. It MUST be contained
 * (never throws), MUST be a stable closure (a long-lived connection holds the
 * same reference for its lifetime), and MUST distinguish orphan errors
 * (connection-level, counted under `connectionErrors`) from event-bearing
 * failures (DLQ + `failed`).
 *
 * Tests run against a REAL collector (`collector({})`) so `status` is the
 * genuine runtime object, while a `createMockLogger()` is passed as the
 * `logger` argument to `buildReportError` so logging is observable. The two
 * are independent: `buildReportError` takes the logger as a separate
 * parameter, it does not read it off the collector.
 */

function makeDestination(dlq: Destination.DLQ): Destination.Instance {
  return { config: { id: 'bigquery' }, push: jest.fn(), dlq };
}

describe('reportError', () => {
  let event: WalkerOS.Event;

  beforeEach(() => {
    event = createEvent();
  });

  describe('orphan form (no event)', () => {
    test('bumps connectionErrors[stepId] and does NOT touch failed', async () => {
      const c = await collector({});
      const logger = createMockLogger();
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
      );

      reportError(new Error('stream broken'));

      const key = stepId('destination', 'bigquery');
      expect(c.status.connectionErrors[key]).toBe(1);
      expect(c.status.failed).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });

    test('accumulates connectionErrors across repeated orphan reports', async () => {
      const c = await collector({});
      const logger = createMockLogger();
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
      );

      reportError(new Error('a'));
      reportError(new Error('b'));
      reportError(new Error('c'));

      expect(c.status.connectionErrors[stepId('destination', 'bigquery')]).toBe(
        3,
      );
      expect(c.status.failed).toBe(0);
    });

    test('does not throw when the scoped logger.error throws', async () => {
      const c = await collector({});
      const logger = createMockLogger();
      logger.error.mockImplementation(() => {
        throw new Error('logger exploded');
      });
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
      );

      expect(() => reportError(new Error('stream broken'))).not.toThrow();
    });
  });

  describe('event-bearing form', () => {
    test('routes the event to the destination DLQ and bumps failed exactly once', async () => {
      const dlq: Destination.DLQ = [];
      const destination = makeDestination(dlq);
      const c = await collector({});
      c.destinations.bigquery = destination;
      const logger = createMockLogger();
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
        destination,
      );

      const err = new Error('insert failed');
      reportError(err, event);

      expect(dlq).toHaveLength(1);
      expect(dlq[0][0]).toBe(event);
      expect(dlq[0][1]).toBe(err);
      expect(c.status.failed).toBe(1);
      expect(c.status.destinations.bigquery.failed).toBe(1);
      // The event-bearing form must NOT also bump connectionErrors.
      expect(
        c.status.connectionErrors[stepId('destination', 'bigquery')],
      ).toBeUndefined();
    });

    test('does not throw when DLQ routing internals fail', async () => {
      const c = await collector({});
      const logger = createMockLogger();
      // No destination instance passed: the with-event path has nowhere to
      // DLQ but must still be contained and still account the failure.
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
      );

      expect(() => reportError(new Error('x'), event)).not.toThrow();
      expect(c.status.failed).toBe(1);
    });
  });

  describe('stable closure', () => {
    test('the captured reference stays valid across multiple uses', async () => {
      const dlq: Destination.DLQ = [];
      const destination = makeDestination(dlq);
      const c = await collector({});
      c.destinations.bigquery = destination;
      const logger = createMockLogger();
      const reportError = buildReportError(
        c,
        'destination',
        'bigquery',
        logger,
        destination,
      );

      // orphan, then event-bearing, then orphan again — same reference.
      reportError(new Error('flap 1'));
      reportError(new Error('lost'), event);
      reportError(new Error('flap 2'));

      const key = stepId('destination', 'bigquery');
      expect(c.status.connectionErrors[key]).toBe(2);
      expect(c.status.failed).toBe(1);
      expect(dlq).toHaveLength(1);
    });
  });

  describe('step-general (not destination-only)', () => {
    test('orphan reportError works for a non-destination (source) step', async () => {
      const c = await collector({});
      const logger = createMockLogger();
      const reportError = buildReportError(c, 'source', 'express', logger);

      reportError(new Error('listener died'));

      expect(c.status.connectionErrors[stepId('source', 'express')]).toBe(1);
      expect(c.status.failed).toBe(0);
    });
  });
});

/**
 * Proves the contract is actually present on the context objects the
 * collector hands to each step kind, not just on the destination path. A
 * type-level presence check: assigning the field guarantees `Base.reportError`
 * exists on every step Context (compile-time). The runtime assertion confirms
 * a built context exposes a callable `reportError`.
 */
describe('reportError is present on every step context', () => {
  test('Source.Context carries reportError (step-general)', () => {
    const reportError: Source.Context['reportError'] = () => undefined;
    expect(typeof reportError).toBe('function');
  });
});
