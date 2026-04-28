import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject, isArray } from '@walkeros/core';

/**
 * Fixed "now" used for createdAt in step examples. Tests must lock
 * Date to this value via jest.useFakeTimers().setSystemTime(FIXED_NOW).
 */
const FIXED_NOW = new Date('2024-01-01T00:00:00.000Z');

/**
 * Mirror of push.ts mapEvent -- stringifies any nested object/array.
 * Duplicated here so examples remain import-free from the runtime push
 * implementation.
 */
function expectedRow(event: WalkerOS.Event): WalkerOS.AnyObject {
  const row: WalkerOS.AnyObject = {
    ...event,
    timestamp: new Date(event.timestamp),
    createdAt: FIXED_NOW,
  };
  return Object.entries(row).reduce<WalkerOS.AnyObject>((acc, [key, value]) => {
    acc[key] =
      isObject(value) || isArray(value) ? JSON.stringify(value) : value;
    return acc;
  }, {});
}

/**
 * Page view -- client.dataset(datasetId).table(tableId).insert([row])
 * The row is the full event with timestamp converted to Date and nested
 * objects/arrays flattened via JSON.stringify. Captured as a single
 * intent-level call: ['dataset.table.insert', datasetId, tableId, rows].
 */
const pageViewEvent = getEvent('page view', {
  timestamp: 1700001100,
  data: { title: 'Documentation', url: 'https://example.com/docs' },
  source: { type: 'express', platform: 'server' },
});

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is inserted as one row into the configured BigQuery table with timestamp converted to Date.',
  in: pageViewEvent,
  mapping: undefined,
  out: [
    [
      'dataset.table.insert',
      'test-dataset',
      'test-table',
      [expectedRow(pageViewEvent)],
    ],
  ],
};

/**
 * Purchase -- nested array in data.items is JSON.stringified as part of
 * the data field in the inserted row.
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
    'An order event is inserted into BigQuery as a single row. The entire nested data object (including arrays like items) is JSON-stringified into the data field via expectedRow().',
  in: purchaseEvent,
  mapping: undefined,
  out: [
    [
      'dataset.table.insert',
      'test-dataset',
      'test-table',
      [expectedRow(purchaseEvent)],
    ],
  ],
};
