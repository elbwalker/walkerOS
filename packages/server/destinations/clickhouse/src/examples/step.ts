import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { eventToRow } from '../eventToRow';
import { deduplicationToken } from '../insert';

/**
 * The endpoint, database and table the examples below write to. The table is
 * stated once because two places need it, the config a user writes and the
 * insert that config produces, and an example where those two disagree would
 * assert nothing.
 */
const settings = {
  url: 'https://clickhouse.example.com:8443',
  database: 'analytics',
  table: 'events',
};

/**
 * Destination bootstrap.
 *
 * `in` is the config a user copy-pastes into a flow: the endpoint, the
 * database and table to write to, and the credentials slot backed by a managed
 * secret. Init creates exactly one ClickHouse client from it and holds that
 * client on the resolved config, so every insert reuses the same connection
 * pool.
 *
 * Two options the user did not write reach the client. `request_timeout` is
 * derived from the collector's per-delivery timeout (10000 ms by default) minus
 * what the retry delays can take, split across the attempts: at one retry that
 * is 4812 ms, so the second attempt finishes before the collector stops waiting
 * and dead-letters a batch the client would still land. Request compression is
 * off in this client by default and insert bodies are large, repetitive JSON,
 * so it is turned on. Both yield to `settings.clickhouse`.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Init creates a single ClickHouse client for the configured endpoint, database and credentials. The client is held on the resolved config and reused by every insert. Its request timeout is derived from the collector timeout so a retried insert cannot outlive the delivery it belongs to, and request compression is enabled.',
  in: {
    settings,
    credentials: {
      username: 'walkeros_writer',
      password: '$secret.CLICKHOUSE_PASSWORD',
    },
  },
  out: [
    [
      'createClient',
      {
        url: 'https://clickhouse.example.com:8443',
        database: 'analytics',
        username: 'walkeros_writer',
        password: '$secret.CLICKHOUSE_PASSWORD',
        request_timeout: 4812,
        compression: { request: true },
      },
    ],
  ],
};

/**
 * What happens to the raw `settings.clickhouse` passthrough.
 *
 * The merge runs in four layers, lowest first: the passthrough, then the
 * derived defaults where the passthrough left their key unset, then `url` and
 * `database`, then `credentials`. An insert names only the table, so a
 * passthrough `database` that disagreed with the configured one would move
 * every row to a different database in silence; the configured one wins. The
 * credentials slot wins over a username or password left in the passthrough,
 * and an option the destination does not name travels through untouched.
 */
export const initPassthrough: Flow.StepExample = {
  title: 'Client option passthrough',
  description:
    "The raw settings.clickhouse options reach the client underneath the destination's own settings: url, database and the credentials slot win over them, an explicit request_timeout or compression wins over the derived default, and any other option travels through untouched.",
  public: false,
  in: {
    settings: {
      url: 'https://clickhouse.example.com:8443',
      database: 'analytics',
      clickhouse: {
        url: 'https://ignored.example.com:8443',
        database: 'ignored',
        username: 'ignored_user',
        request_timeout: 60000,
        max_open_connections: 25,
        application: 'walkeros',
      },
    },
    credentials: {
      username: 'walkeros_writer',
      password: '$secret.CLICKHOUSE_PASSWORD',
    },
  },
  out: [
    [
      'createClient',
      {
        url: 'https://clickhouse.example.com:8443',
        database: 'analytics',
        username: 'walkeros_writer',
        password: '$secret.CLICKHOUSE_PASSWORD',
        request_timeout: 60000,
        max_open_connections: 25,
        application: 'walkeros',
        compression: { request: true },
      },
    ],
  ],
};

// Event step examples belong below this line. The step-example test iterates
// every entry exported from this module and slices the captured calls by
// `init.out.length`, so an appended entry needs no test change.

/**
 * The insert one event produces. Rows come from `eventToRow`, so an example can
 * never claim a column shape the destination does not emit.
 *
 * The per-insert settings are spelled out here rather than read from the code
 * on purpose. They are the three settings that make a schema mismatch loud
 * instead of silent and keep the acknowledgement tied to a durable write,
 * nothing in the type system forces the insert call to send them, and an
 * insert that quietly stopped sending them would keep every other test green.
 * The deduplication token sits inside that same object: it is what lets a
 * retry of a batch the server may already have written land without counting
 * those rows twice, and it is computed from the event ids, so this example
 * reads it from the destination rather than restating a digest.
 */
function expectedInsert(event: WalkerOS.Event): Flow.StepOut {
  return [
    [
      'insert',
      {
        table: settings.table,
        values: [eventToRow(event)],
        format: 'JSONEachRow',
        clickhouse_settings: {
          async_insert: 0,
          input_format_skip_unknown_fields: 0,
          input_format_null_as_default: 0,
          insert_deduplication_token: deduplicationToken([event.id]),
        },
      },
    ],
  ];
}

const pageViewEvent = getEvent('page view', { timestamp: 1700000000123 });

/**
 * One event, one row, one insert. Every payload travels as a JSON-encoded
 * string and the timestamp as a `YYYY-MM-DD hh:mm:ss.SSS` UTC literal, the
 * format every ClickHouse date parser reads identically.
 */
export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is inserted as a single JSONEachRow row. The payload columns (data, context, globals, custom, user, nested, consent, source) are JSON-encoded strings and the timestamp is a UTC datetime literal, both produced by eventToRow.',
  in: pageViewEvent,
  mapping: undefined,
  out: expectedInsert(pageViewEvent),
};

const purchaseEvent = getEvent('order complete', {
  timestamp: 1700000000456,
  data: {
    id: 'ORD-500',
    currency: 'EUR',
    total: 199.99,
    items: [
      { sku: 'SKU-1', quantity: 2 },
      { sku: 'SKU-2', quantity: 1 },
    ],
  },
});

/**
 * An order carries an array of items. The whole `data` object, array
 * included, is JSON-encoded into the single `data` column, so a flow can send
 * any shape without the table knowing about it.
 */
export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order event is inserted as one row. The nested items array is JSON-encoded into the data column, so a richer payload needs no table change. Promoting a hot key to its own column is a MATERIALIZED expression in the table DDL, not a destination setting.',
  in: purchaseEvent,
  mapping: undefined,
  out: expectedInsert(purchaseEvent),
};
