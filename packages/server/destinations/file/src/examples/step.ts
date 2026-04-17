import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Format } from '../types';

/**
 * Raw filename-config shape accepted in step examples and flow.json.
 * Mirrors the runtime Settings.filename but types `fn` as string so
 * `$code:` tags (resolved at bundle time by walkerOS) are expressible
 * here without casting to a function type.
 */
export interface FileSettingsJson {
  filename:
    | string
    | {
        key?: string;
        fn?: string | ((value: unknown) => unknown);
        value?: unknown;
      };
  format?: Format;
  fields?: string[];
}

/**
 * Extended step example that carries destination-level settings for the
 * file destination. The test derives settings from example.settings and
 * asserts against example.out (filename + optional exact line).
 */
export type FileStepExample = Flow.StepExample & {
  settings: FileSettingsJson;
  out: {
    filename: string;
    line?: string;
    format?: Format;
  };
};

/** Default JSONL append. Static filename, all defaults. */
export const jsonlDefault: FileStepExample = {
  in: getEvent('page view', { timestamp: 1700000000000 }),
  settings: { filename: 'events.jsonl' },
  out: {
    filename: 'events.jsonl',
    format: 'jsonl',
  },
};

/** Baersch-style TSV log: PHP parity case. */
export const tsvBaerschLog: FileStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000000000,
    data: { title: 'Docs' },
    user: { session: 'sess-1' },
    source: {
      id: 'https://example.com/docs',
      type: 'server',
      previous_id: 'https://example.com/',
    },
  }),
  settings: {
    filename: 'storage/mblog.txt',
    format: 'tsv',
    fields: [
      'timestamp',
      'user.session',
      'name',
      'source.id',
      'data.title',
      'source.previous_id',
    ],
  },
  out: {
    filename: 'storage/mblog.txt',
    line: '1700000000000\tsess-1\tpage view\thttps://example.com/docs\tDocs\thttps://example.com/\n',
  },
};

/** Tenant sharding via plain key extraction. */
export const jsonlTenantShardKey: FileStepExample = {
  in: getEvent('custom event', {
    timestamp: 1700000000000,
    data: { tenant: 'acme' },
  }),
  settings: {
    filename: { key: 'data.tenant' },
    format: 'jsonl',
  },
  out: {
    filename: 'acme',
    format: 'jsonl',
  },
};

/**
 * Daily rotation via a mapping fn. In flow.json this is authored as a
 * `$code:` string; walkerOS compiles it to a function at bundle time. For
 * in-process tests we pass the already-compiled function directly so the
 * example exercises the same code path without needing the bundler.
 */
export const jsonlDailyRotation: FileStepExample = {
  in: getEvent('order complete', {
    timestamp: Date.UTC(2026, 3, 15, 12, 34, 56),
    data: { id: 'ORD-1' },
  }),
  settings: {
    filename: {
      fn: (value) => {
        const event = value as { timestamp?: number };
        const ts = event.timestamp ?? 0;
        return `events-${new Date(ts).toISOString().slice(0, 10)}.jsonl`;
      },
    },
    format: 'jsonl',
  },
  out: {
    filename: 'events-2026-04-15.jsonl',
    format: 'jsonl',
  },
};

/** CSV with an object cell. data is JSON-stringified, properly quoted. */
export const csvObjectCell: FileStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000000000,
    data: { title: 'Hello, "World"', count: 3 },
  }),
  settings: {
    filename: 'events.csv',
    format: 'csv',
    fields: ['timestamp', 'name', 'data'],
  },
  out: {
    filename: 'events.csv',
    line: '1700000000000,page view,"{""title"":""Hello, \\""World\\"""",""count"":3}"\n',
  },
};
