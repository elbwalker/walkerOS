import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { eventToRow } from '../eventToRow';

/**
 * Mirror of push.ts via eventToRow() -- produces a flat 15-column row
 * with nested object/array values JSON-stringified. Imported directly
 * from the runtime helper so the step examples stay in sync with what
 * push.ts actually emits to JSONWriter.appendRows.
 */
function expectedRow(event: WalkerOS.Event) {
  return eventToRow(event);
}

/**
 * Page view -- one row appended through JSONWriter.appendRows([row]).
 * Captured as a single intent-level call: ['appendRows', [row]].
 */
const pageViewEvent = getEvent('page view', {
  timestamp: 1700001100000,
  data: { title: 'Documentation', url: 'https://example.com/docs' },
  source: { type: 'express', platform: 'server' },
});

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is appended as one row through the BigQuery Storage Write API JSONWriter. Nested objects/arrays in data, source, etc. are JSON-stringified by eventToRow.',
  in: pageViewEvent,
  mapping: undefined,
  out: [['appendRows', [expectedRow(pageViewEvent)]]],
};

/**
 * Purchase -- nested array in data.items is JSON.stringified into the
 * data column of the appended row.
 */
const purchaseEvent = getEvent('order complete', {
  timestamp: 1700001101000,
  data: {
    id: 'ORD-500',
    value: 199.99,
    items: [{ sku: 'SKU-1', qty: 2 }],
  },
  source: { type: 'express', platform: 'server' },
});

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order event is appended as a single row through JSONWriter.appendRows. The entire nested data object (including arrays like items) is JSON-stringified into the data column via eventToRow().',
  in: purchaseEvent,
  mapping: undefined,
  out: [['appendRows', [expectedRow(purchaseEvent)]]],
};

/** A silent rule appends no row. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true appends no row.',
  in: getEvent('page view', { timestamp: 1700000000500 }),
  mapping: { silent: true },
  out: [],
};

/**
 * A failed append: the Storage Write call fails, so the row is not written
 * and the push fails, retryable, instead of counting as delivered. An append
 * the server answers with an error status (a quota, a dropped table) fails
 * the same way, retryable only for the statuses the SDK retries itself.
 */
export const appendFailed: Flow.StepExample = {
  public: false,
  description:
    'A failed Storage Write append fails the push, retryable, instead of counting as delivered.',
  in: getEvent('page view', { timestamp: 1700001102000 }),
  respond: { error: 'network' },
  out: [
    [
      'appendRows',
      [expectedRow(getEvent('page view', { timestamp: 1700001102000 }))],
    ],
  ],
  outcome: { status: 'failed', code: 'transport', retryable: true },
};
