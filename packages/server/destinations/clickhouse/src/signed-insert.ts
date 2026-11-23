import type {
  ClickHouseClientConfigOptions,
  ClickHouseSettings,
  InsertResult,
} from '@clickhouse/client';
import type { Authorize } from '@walkeros/core';
import {
  StepError,
  clockOffsetSeconds,
  getErrorMessage,
  retryAfterSeconds,
} from '@walkeros/core';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { AnswerError, errnoOf } from './classify';
import type { ClickHouseClientSurface } from './types';

/** The longest part of a failed answer's body an error keeps. */
const ANSWER_BODY_MAX = 4096;

/** The one format the destination inserts in. */
const FORMAT = 'JSONEachRow';

/** One insert's body, built once for every attempt of it. */
interface Prepared {
  /** The rows as JSONEachRow, gzipped: the exact bytes each attempt signs. */
  body: Uint8Array;
  query: string;
  settings: ClickHouseSettings;
}

/**
 * An insert that got no answer, carrying the socket's errno as its code the
 * way the client's own rejections do, so the failure line names it.
 */
class NoAnswer extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'NoAnswer';
    if (code !== undefined) this.code = code;
  }
}

/**
 * A ClickHouse setting as the client puts it in the query string; a value
 * the client would refuse is refused here too.
 */
function settingValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number' || typeof value === 'string')
    return String(value);
  throw new StepError(
    `ClickHouse setting ${key} is not a number, string or boolean`,
    { code: 'config', retryable: false },
  );
}

/**
 * The URL of one attempt, as the client builds it: the configured url with
 * its path, then `query_id` (new per attempt, as the client makes one per
 * request), the insert's settings, the database unless it is `default`, and
 * the query.
 */
function attemptUrl(
  base: string | URL,
  options: ClickHouseClientConfigOptions,
  prepared: Prepared,
): { url: string; queryId: string } {
  const url = new URL(base);
  if (options.pathname)
    url.pathname =
      url.pathname === '/' ? options.pathname : url.pathname + options.pathname;
  const queryId = randomUUID();
  const search = new URLSearchParams([['query_id', queryId]]);
  for (const [key, value] of Object.entries(prepared.settings))
    if (value !== undefined) search.append(key, settingValue(key, value));
  if (options.database !== undefined && options.database !== 'default')
    search.append('database', options.database);
  search.append('query', prepared.query);
  url.search = search.toString();
  return { url: url.toString(), queryId };
}

/** The errno under a fetch rejection (`ECONNREFUSED`), when one is there. */
function errnoUnder(error: unknown): string | undefined {
  const cause =
    typeof error === 'object' && error !== null && 'cause' in error
      ? error.cause
      : undefined;
  return errnoOf(cause) ?? errnoOf(error);
}

/**
 * The signed insert: the client surface the insert path calls, sending each
 * insert as the request `@clickhouse/client` sends for it (method, path,
 * query parameters, `Content-Encoding: gzip`), with the headers `authorize`
 * answers for its exact bytes instead of a credential. Used only with
 * `settings.signed: true` and a host that signs (a paired runner writing to
 * walkerOS hosted ingest).
 *
 * Each attempt asks `authorize` anew, so a retry carries a fresh signature;
 * the body is built and gzipped once per insert, which the insert path
 * sends as one parameter object on every attempt. It sends no
 * `Authorization` and follows no redirect, since a signature names one
 * target. A failed answer throws `AnswerError` for `classify`; a refused
 * signature throws a terminal `StepError` naming the signer's reason.
 */
export function createSignedClient(
  options: ClickHouseClientConfigOptions,
  authorize: Authorize,
): ClickHouseClientSurface {
  const base = options.url;
  if (base === undefined)
    throw new StepError('Config settings url missing', { code: 'config' });
  const prepared = new WeakMap<object, Prepared>();
  const open = new Set<AbortController>();
  const timeoutMs = options.request_timeout;

  return {
    async insert(params): Promise<InsertResult> {
      const { values } = params;
      if (!Array.isArray(values) || params.format !== FORMAT)
        throw new StepError(
          `A signed insert sends ${FORMAT} rows of an array only`,
          { code: 'config', retryable: false },
        );

      let insert = prepared.get(params);
      if (!insert) {
        const rows: readonly unknown[] = values;
        const text = rows.map((row) => `${JSON.stringify(row)}\n`).join('');
        insert = {
          body: new Uint8Array(gzipSync(text)),
          query: `INSERT INTO ${params.table.trim()} FORMAT ${FORMAT}`,
          settings: params.clickhouse_settings ?? {},
        };
        prepared.set(params, insert);
      }

      const { url, queryId } = attemptUrl(base, options, insert);
      let signature: Record<string, string>;
      try {
        signature = await authorize({ method: 'POST', url, body: insert.body });
      } catch (error) {
        throw new StepError(
          `ClickHouse insert not signed: ${getErrorMessage(error)}`,
          { code: 'auth', retryable: false, cause: error },
        );
      }

      const controller = new AbortController();
      open.add(controller);
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => controller.abort(), timeoutMs);
      timer?.unref();
      try {
        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { ...signature, 'Content-Encoding': 'gzip' },
            body: insert.body,
            redirect: 'error',
            signal: controller.signal,
          });
        } catch (error) {
          throw new NoAnswer(getErrorMessage(error), errnoUnder(error));
        }

        const text = await response.text().catch(() => '');
        if (response.ok)
          return { executed: true, query_id: queryId, response_headers: {} };

        const { status, headers } = response;
        const code = headers.get('X-ClickHouse-Exception-Code') ?? undefined;
        throw new AnswerError(
          text.slice(0, ANSWER_BODY_MAX) || `responded ${status}`,
          {
            status,
            code: code !== undefined && /^\d+$/.test(code) ? code : undefined,
            retryAfter:
              status === 503
                ? retryAfterSeconds(headers.get('Retry-After'))
                : undefined,
            clockOffset:
              status === 403
                ? clockOffsetSeconds(headers.get('Date'), Date.now())
                : undefined,
          },
        );
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        open.delete(controller);
      }
    },

    // As the client's close destroys its sockets, a request still in flight
    // at the end of a shutdown is aborted.
    async close() {
      for (const controller of open) controller.abort();
      open.clear();
    },
  };
}
