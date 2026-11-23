import type { IncomingHttpHeaders, Server } from 'node:http';
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
import type { Authorize, Logger } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import destination from '../';
import type { Credentials, InitSettings } from '../types';

// The real client and the signed insert against one stand-in for the data
// server's door on the loopback: what it records is what the door receives.
jest.unmock('@clickhouse/client');

interface Received {
  method?: string;
  /** The request target as sent: path and query. */
  target: string;
  path: string;
  params: URLSearchParams;
  headers: IncomingHttpHeaders;
  /** The body's bytes as they arrived. */
  raw: Uint8Array;
  at: number;
}

interface Answer {
  status: number;
  /** Read when the answer is sent, so a `Date` is current. */
  headers?: () => Record<string, string>;
  body?: string;
}

interface Door {
  origin: string;
  url: string;
  received: Received[];
  close(): Promise<void>;
}

/** A door that records each request and gives the answers in order, then 200. */
async function door(answers: Answer[] = []): Promise<Door> {
  const received: Received[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const target = request.url ?? '/';
      const parsed = new URL(target, 'http://127.0.0.1');
      received.push({
        method: request.method,
        target,
        path: parsed.pathname,
        params: parsed.searchParams,
        headers: request.headers,
        raw: new Uint8Array(Buffer.concat(chunks)),
        at: Date.now(),
      });
      const answer = answers[received.length - 1] ?? { status: 200 };
      response
        .writeHead(answer.status, answer.headers?.())
        .end(answer.body ?? '');
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('the door listens on a port');
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    url: `${origin}/events`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

function rowsOf(received: Received): Record<string, unknown>[] {
  const raw = Buffer.from(received.raw);
  const text =
    received.headers['content-encoding'] === 'gzip'
      ? gunzipSync(raw).toString()
      : raw.toString();
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const row: unknown = JSON.parse(line);
      if (!isObject(row)) throw new Error('a JSONEachRow line is an object');
      return row;
    });
}

/** A signer that records what it signed and answers numbered headers. */
function signer() {
  const signed: Array<{ method: string; url: string; body?: Uint8Array }> = [];
  const authorize: Authorize = async (request) => {
    signed.push(request);
    return {
      'Signature-Input': `sig1=("@method" "@target-uri" "content-digest");n=${signed.length}`,
      Signature: `sig1=:${signed.length}:`,
      'Content-Digest': 'sha-256=:stub:',
    };
  };
  return { signed, authorize };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('the signed insert', () => {
  let open: Door | undefined;
  let errors: string[];
  // The line as a runner prints it: the message and its context.
  const handler: Logger.Handler = (_level, message, context) => {
    errors.push(`${message} ${JSON.stringify(context)}`);
  };

  beforeEach(() => {
    errors = [];
  });

  afterEach(async () => {
    await open?.close();
    open = undefined;
  });

  /** One event through a real collector into the destination, then shutdown. */
  async function deliver(options: {
    url: string;
    settings?: Partial<InitSettings>;
    credentials?: Credentials;
    authorize?: Authorize;
  }) {
    const { collector, elb } = await startFlow({
      logger: { level: 'ERROR', handler },
      destinations: {
        clickhouse: {
          code: destination,
          config: {
            settings: { url: options.url, ...options.settings },
            ...(options.credentials && { credentials: options.credentials }),
          },
          ...(options.authorize && { env: { authorize: options.authorize } }),
        },
      },
    });
    const event = getEvent('page view');
    const result = await elb(event);
    const dlq = collector.destinations.clickhouse?.dlq ?? [];
    await collector.command('shutdown');
    return { event, result, dlq };
  }

  it("sends the client's request for the same insert, signed over the exact bytes", async () => {
    open = await door();
    await deliver({ url: open.url });
    const { signed, authorize } = signer();
    await deliver({ url: open.url, settings: { signed: true }, authorize });

    const [client, own] = open.received;
    expect(own.method).toBe(client.method);
    expect(own.path).toBe('/events');
    expect(own.path).toBe(client.path);
    const without = (params: URLSearchParams) =>
      [...params.entries()].filter(([key]) => key !== 'query_id');
    expect(without(own.params)).toEqual(without(client.params));
    expect(own.params.get('query_id')).toMatch(UUID);
    expect(own.params.get('query_id')).not.toBe(client.params.get('query_id'));
    expect(own.headers['content-encoding']).toBe('gzip');
    expect(client.headers['content-encoding']).toBe('gzip');
    expect(own.headers.authorization).toBeUndefined();
    expect(own.headers).toMatchObject({
      signature: 'sig1=:1:',
      'signature-input': expect.stringContaining('n=1'),
      'content-digest': 'sha-256=:stub:',
    });
    expect(rowsOf(own)).toEqual(rowsOf(client).map(expect.objectContaining));
    expect(signed).toEqual([
      { method: 'POST', url: `${open.origin}${own.target}`, body: own.raw },
    ]);
    expect(errors).toEqual([]);
  });

  // A door that does not know the key yet, or started after the signature,
  // asks for a retry after a delay; the retry signs anew and delivers once.
  it('retries a 503 after its Retry-After of 1 s with a fresh signature, and delivers once', async () => {
    open = await door([
      { status: 503, headers: () => ({ 'Retry-After': '1' }) },
    ]);
    const { signed, authorize } = signer();

    const { result } = await deliver({
      url: open.url,
      settings: { signed: true },
      authorize,
    });

    expect(result.ok).toBe(true);
    expect(open.received).toHaveLength(2);
    const [first, second] = open.received;
    expect(second.at - first.at).toBeGreaterThanOrEqual(1000);
    expect([first.headers.signature, second.headers.signature]).toEqual([
      'sig1=:1:',
      'sig1=:2:',
    ]);
    expect(signed.map(({ body }) => body)).toEqual([first.raw, second.raw]);
    expect(first.raw).toEqual(second.raw);
    expect(errors).toEqual([]);
  });

  // A refused signature fails again; the batch is dead-lettered at once with
  // one line, naming a clock that is off by more than 5 s.
  // A Date carries whole seconds, so a Date 31 s past this second reads as
  // 30 or 31 s ahead, whatever this second's fraction.
  it.each<[string, () => Record<string, string>, string]>([
    [
      'a Date 30 s ahead',
      () => ({
        Date: new Date(
          Math.floor(Date.now() / 1000) * 1000 + 31_000,
        ).toUTCString(),
      }),
      'The data server refused the insert: 403, clock offset 3[01] s',
    ],
    [
      'no Date',
      () => ({}),
      'The data server refused the insert: 403(?!, clock)',
    ],
  ])(
    'dead-letters a 403 with %s as code auth and one ERROR line',
    async (_name, headers, message) => {
      open = await door([{ status: 403, headers, body: 'refused' }]);
      const { authorize } = signer();

      const { event, result, dlq } = await deliver({
        url: open.url,
        settings: { signed: true },
        authorize,
      });

      expect(open.received).toHaveLength(1);
      expect(result.failed?.clickhouse?.reason).toEqual({
        code: 'auth',
        status: 403,
        retryable: false,
        message: expect.stringMatching(new RegExp(`^${message}$`)),
      });
      expect(dlq.map(([dead]) => dead.id)).toEqual([event.id]);
      expect(errors).toEqual([expect.stringMatching(new RegExp(message))]);
      expect(errors.join('\n')).not.toContain('refused"');
    },
  );

  // A signer that refuses (an http URL to a public host, the app's origin)
  // fails the insert at once with its fact, and no request leaves.
  it('dead-letters an insert its signer refuses as code auth, sending nothing', async () => {
    open = await door();
    const fact =
      'The door signer signs https, or http to a loopback or private host, only';
    let calls = 0;
    const authorize: Authorize = async () => {
      calls += 1;
      throw new Error(fact);
    };

    const { event, result, dlq } = await deliver({
      url: open.url,
      settings: { signed: true },
      authorize,
    });

    expect(open.received).toEqual([]);
    expect(calls).toBe(1);
    expect(result.failed?.clickhouse?.reason).toEqual({
      code: 'auth',
      retryable: false,
      message: `ClickHouse insert not signed: ${fact}`,
    });
    expect(dlq.map(([dead]) => dead.id)).toEqual([event.id]);
    expect(errors).toEqual([expect.stringContaining(fact)]);
  });

  // Without the opt-in, a host's signer changes nothing: a customer's own
  // ClickHouse keeps its credential, or none, and the client path.
  it.each<[string, Credentials | undefined, boolean, string | undefined]>([
    ['a signer and no credential', undefined, true, 'Basic ZGVmYXVsdDo='],
    [
      'a signer and a token',
      { token: 'ingest-token-example' },
      true,
      'Bearer ingest-token-example',
    ],
    [
      'neither a signer nor a credential',
      undefined,
      false,
      'Basic ZGVmYXVsdDo=',
    ],
  ])(
    'sends through the client, unsigned, with %s',
    async (_name, credentials, withSigner, authorization) => {
      open = await door();
      const { signed, authorize } = signer();

      const { result } = await deliver({
        url: open.url,
        credentials,
        ...(withSigner && { authorize }),
      });

      expect(result.ok).toBe(true);
      expect(open.received).toHaveLength(1);
      expect(open.received[0].headers.authorization).toBe(authorization);
      expect(open.received[0].headers.signature).toBeUndefined();
      expect(signed).toEqual([]);
    },
  );

  it.each<[string, Partial<InitSettings>, Credentials | undefined, boolean]>([
    ['without a host that signs', { signed: true }, undefined, false],
    [
      'beside credentials.token',
      { signed: true },
      { token: 'ingest-token-example' },
      true,
    ],
    [
      'beside a client option',
      { signed: true, clickhouse: { compression: { request: false } } },
      undefined,
      true,
    ],
  ])(
    'refuses settings.signed %s at init with one ERROR line',
    async (_name, settings, credentials, withSigner) => {
      open = await door();
      const { signed, authorize } = signer();

      const { result } = await deliver({
        url: open.url,
        settings,
        credentials,
        ...(withSigner && { authorize }),
      });

      expect(result.failed?.clickhouse?.reason).toMatchObject({
        code: 'config',
        message: expect.stringContaining('settings.signed'),
      });
      expect(errors).toEqual([expect.stringContaining('settings.signed')]);
      expect(errors.join('\n')).not.toContain('ingest-token-example');
      expect(open.received).toEqual([]);
      expect(signed).toEqual([]);
    },
  );
});
