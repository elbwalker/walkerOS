import type { IncomingHttpHeaders, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
import type { Logger } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import destination from '../';
import { deduplicationToken } from '../insert';

// The real client on a real socket: what the server below records is what a
// proxy in front of ClickHouse receives. It listens on the loopback only, so
// no request leaves the machine.
jest.unmock('@clickhouse/client');

const token = 'wos_events_aaaabbbbccccdddd_secret';

interface Received {
  method?: string;
  path: string;
  params: URLSearchParams;
  headers: IncomingHttpHeaders;
  body: string;
}

interface Proxy {
  url: string;
  received: Received[];
  close(): Promise<void>;
}

/** A stand-in for the ingest proxy that records each request and answers it. */
async function listen(answer: (response: ServerResponse) => void) {
  const received: Received[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks);
      const target = new URL(request.url ?? '/', 'http://127.0.0.1');
      received.push({
        method: request.method,
        path: target.pathname,
        params: target.searchParams,
        headers: request.headers,
        body:
          request.headers['content-encoding'] === 'gzip'
            ? gunzipSync(raw).toString()
            : raw.toString(),
      });
      answer(response);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('the server listens on a port');

  const proxy: Proxy = {
    url: `http://127.0.0.1:${address.port}/events`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };

  return proxy;
}

function rowsOf(body: string): Record<string, unknown>[] {
  return body
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const row: unknown = JSON.parse(line);
      if (!isObject(row)) throw new Error('a JSONEachRow line is an object');
      return row;
    });
}

describe('on the wire', () => {
  let proxy: Proxy | undefined;
  let errors: string[];
  // The line as a runner prints it: the message and its context.
  const handler: Logger.Handler = (_level, message, context) => {
    errors.push(`${message} ${JSON.stringify(context)}`);
  };

  beforeEach(() => {
    errors = [];
  });

  afterEach(async () => {
    await proxy?.close();
    proxy = undefined;
  });

  it('sends one batch to the path of the url, with the token as a Bearer header', async () => {
    proxy = await listen((response) => {
      response.writeHead(200).end();
    });
    const { collector, elb } = await startFlow({
      logger: { level: 'ERROR', handler },
      destinations: {
        clickhouse: {
          code: destination,
          config: {
            settings: { url: proxy.url },
            credentials: { token },
            batch: { size: 2 },
          },
        },
      },
    });

    await elb(getEvent('page view'));
    await elb(getEvent('product view'));
    await collector.command('shutdown');

    expect(proxy.received).toHaveLength(1);
    const [request] = proxy.received;
    const rows = rowsOf(request.body);

    expect(request).toMatchObject({ method: 'POST', path: '/events' });
    expect([...request.params.keys()].sort()).toEqual([
      'async_insert',
      'input_format_null_as_default',
      'input_format_skip_unknown_fields',
      'insert_deduplication_token',
      'query',
      'query_id',
    ]);
    expect(Object.fromEntries(request.params)).toMatchObject({
      query: 'INSERT INTO events FORMAT JSONEachRow',
      async_insert: '0',
      input_format_skip_unknown_fields: '0',
      input_format_null_as_default: '0',
      insert_deduplication_token: deduplicationToken(
        rows.map((row) => String(row.id)),
      ),
    });
    expect(request.headers.authorization).toBe(`Bearer ${token}`);
    expect(request.headers['content-encoding']).toBe('gzip');
    expect(rows.map((row) => row.name)).toEqual(['page view', 'product view']);
    expect(errors).toEqual([]);
  });

  // The proxy refuses before ClickHouse sees the request, so the answer
  // carries no ClickHouse code: the batch retries once as any codeless
  // failure does, and the ERROR line quotes the answer's first line.
  it("names a proxy's refusal by the first line of its answer", async () => {
    const refusal =
      'walkerOS data proxy refused the request: the token belongs to another route';
    proxy = await listen((response) => {
      response
        .writeHead(403, { 'Content-Type': 'text/plain' })
        .end(`${refusal}\nsecond line\n`);
    });
    const { collector, elb } = await startFlow({
      logger: { level: 'ERROR', handler },
      destinations: {
        clickhouse: {
          code: destination,
          config: { settings: { url: proxy.url }, credentials: { token } },
        },
      },
    });

    const result = await elb(getEvent('page view'));
    await collector.command('shutdown');

    expect(proxy.received).toHaveLength(2);
    expect(result.failed?.clickhouse?.reason).toMatchObject({
      message: `ClickHouse insert failed: ${refusal}`,
      retryable: true,
    });
    expect(errors).toEqual([expect.stringContaining(refusal)]);
    expect(errors.join('\n')).not.toContain('second line');
  });
});
