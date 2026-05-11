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
  timestamp: 1700001100,
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
  timestamp: 1700001101,
  data: {
    id: 'ORD-500',
    total: 199.99,
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
