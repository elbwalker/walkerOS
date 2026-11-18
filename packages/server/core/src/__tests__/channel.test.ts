import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import type { CheckInResult } from '../channel';
import {
  ChannelError,
  cappedChunks,
  conditionalGet,
  createCheckInLoop,
  openStream,
  postJson,
} from '../channel';

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

interface Received {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

interface AuthorizeCall {
  method: string;
  url: string;
  body?: Uint8Array;
}

const AUTH_HEADERS = {
  Authorization: 'Bearer test-token',
  'X-Signature': 'test-signature',
};

let routes: Record<string, Handler> = {};
let received: Received[] = [];
let authorized: AuthorizeCall[] = [];
let base = '';

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    received.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks),
    });
    const route = routes[req.url || ''];
    if (route) return route(req, res);
    res.writeHead(500).end();
  });
});

async function authorize(request: AuthorizeCall) {
  authorized.push(request);
  return AUTH_HEADERS;
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const chunk of chunks) parts.push(Buffer.from(chunk));
  return Buffer.concat(parts);
}

async function* fromChunks(chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
  for (const chunk of chunks) yield chunk;
}

beforeAll(async () => {
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('The test server has no port');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  routes = {};
  received = [];
  authorized = [];
});

describe('conditionalGet', () => {
  it('sends If-None-Match and the headers authorize returned, authorized once with the method and URL', async () => {
    routes['/release'] = (_, res) => res.writeHead(304).end();
    await conditionalGet({
      url: `${base}/release`,
      authorize,
      timeoutMs: 1000,
      etag: '"abc"',
      maxBytes: 1024,
    });
    expect(received[0].headers).toMatchObject({
      'if-none-match': '"abc"',
      authorization: 'Bearer test-token',
      'x-signature': 'test-signature',
    });
    expect(authorized).toEqual([{ method: 'GET', url: `${base}/release` }]);
  });

  it.each<[string, Handler, unknown]>([
    [
      '200 with its ETag and body',
      (_, res) => res.writeHead(200, { ETag: '"abc"' }).end('{"version":1}'),
      { status: 200, etag: '"abc"', body: '{"version":1}' },
    ],
    ['304', (_, res) => res.writeHead(304).end(), { status: 304 }],
    ['404', (_, res) => res.writeHead(404).end('none'), { status: 404 }],
  ])('answers a %s', async (_, handler, expected) => {
    routes['/release'] = handler;
    const answer = await conditionalGet({
      url: `${base}/release`,
      authorize,
      timeoutMs: 1000,
      maxBytes: 1024,
    });
    expect(
      answer.status === 200 ? { ...answer, body: text(answer.body) } : answer,
    ).toEqual(expected);
  });
});

describe('an authorize header value HTTP cannot carry', () => {
  const head = 'wos_runner_4f1c';
  const tail = 'Q7mZp2RkT9vXcL8n';

  it.each([
    ['CR', '\r'],
    ['LF', '\n'],
    ['NUL', '\0'],
  ])(
    'with a %s fails as a ChannelError naming the header, with no part of the value anywhere on it',
    async (_, separator) => {
      routes['/release'] = (_, res) => res.writeHead(200).end('{}');
      const answer = conditionalGet({
        url: `${base}/release`,
        authorize: async () => ({
          Authorization: `Bearer ${head}${separator}${tail}`,
        }),
        timeoutMs: 1000,
        maxBytes: 1024,
      });
      const error: unknown = await answer.catch((thrown: unknown) => thrown);
      expect(error).toBeInstanceOf(ChannelError);
      expect(error).toMatchObject({
        failure: 'transport',
        hop: 'origin',
        message:
          'authorize answered a value for header Authorization that HTTP cannot carry',
      });
      expect(error).not.toHaveProperty('cause');
      // Every own property, and those of anything nested, message and stack included.
      const dump =
        error instanceof Error
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : '';
      for (const part of ['Bearer', head, tail])
        expect(dump).not.toContain(part);
      expect(received).toEqual([]);
    },
  );

  it('fails a header name HTTP cannot carry without quoting the name', async () => {
    await expect(
      conditionalGet({
        url: `${base}/release`,
        authorize: async () => ({ 'X-Key\nwos_runner_4f1c': 'value' }),
        timeoutMs: 1000,
        maxBytes: 1024,
      }),
    ).rejects.toMatchObject({
      failure: 'transport',
      hop: 'origin',
      message: 'authorize answered a header name HTTP cannot carry',
    });
    expect(received).toEqual([]);
  });
});

describe('postJson', () => {
  it('sends the JSON body with its content type and the authorize headers, authorized with the bytes it sends', async () => {
    routes['/check-in'] = (_, res) => res.writeHead(200).end('{"release":3}');
    const answer = await postJson({
      url: `${base}/check-in`,
      authorize,
      timeoutMs: 1000,
      body: { instanceId: '3f9a2b7c1d4e5f60' },
      maxBytes: 1024,
    });
    expect(text(answer)).toBe('{"release":3}');
    expect(received[0]).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
      },
    });
    expect(received[0].body.toString()).toBe(
      '{"instanceId":"3f9a2b7c1d4e5f60"}',
    );
    expect(authorized).toHaveLength(1);
    expect(authorized[0]).toMatchObject({
      method: 'POST',
      url: `${base}/check-in`,
    });
    expect(Buffer.from(authorized[0].body || [])).toEqual(received[0].body);
  });
});

describe('a failed request', () => {
  const requests = {
    conditionalGet: (url: string) =>
      conditionalGet({ url, authorize, timeoutMs: 300, maxBytes: 1024 }),
    postJson: (url: string) =>
      postJson({ url, authorize, timeoutMs: 300, maxBytes: 1024, body: {} }),
  };

  type FailureCase = [keyof typeof requests, string, Handler, object];
  const calls: Array<keyof typeof requests> = ['conditionalGet', 'postJson'];

  it.each<FailureCase>(
    calls.flatMap((call): FailureCase[] => [
      [
        call,
        '401',
        (_, res) => res.writeHead(401).end(),
        { failure: 'refused', status: 401 },
      ],
      [
        call,
        '403',
        (_, res) => res.writeHead(403).end(),
        { failure: 'refused', status: 403 },
      ],
      [
        call,
        '429 with Retry-After 7',
        (_, res) => res.writeHead(429, { 'Retry-After': '7' }).end(),
        { failure: 'transport', status: 429, retryAfterMs: 7000 },
      ],
      [
        call,
        '503',
        (_, res) => res.writeHead(503).end(),
        { failure: 'transport', status: 503 },
      ],
      [
        call,
        'connection reset without an answer',
        (req) => req.socket.destroy(),
        { failure: 'transport' },
      ],
      [
        call,
        'body past maxBytes',
        (_, res) => res.writeHead(200).end(Buffer.alloc(4096, 1)),
        { failure: 'size' },
      ],
      [call, 'no answer within timeoutMs', () => {}, { failure: 'timeout' }],
      [
        call,
        'body stalled after its headers',
        (_, res) => res.writeHead(200).write('{"ver'),
        { failure: 'timeout' },
      ],
      [
        call,
        '302',
        (_, res) => res.writeHead(302, { Location: '/elsewhere' }).end(),
        { failure: 'redirect', status: 302 },
      ],
    ]),
  )(
    '%s fails a %s from its own URL as a ChannelError of hop origin',
    async (call, _, handler, expected) => {
      routes['/path'] = handler;
      const answer = requests[call](`${base}/path`);
      await expect(answer).rejects.toBeInstanceOf(ChannelError);
      await expect(answer).rejects.toMatchObject({
        ...expected,
        hop: 'origin',
      });
    },
  );

  it('closes the connection of a body past maxBytes, long before its time limit', async () => {
    const closed = new Promise<string>((resolve) => {
      routes['/big'] = (_, res) => {
        res.on('close', () =>
          resolve(res.writableFinished ? 'finished' : 'closed by the client'),
        );
        res.writeHead(200);
        const chunk = Buffer.alloc(64 * 1024, 1);
        // Writes without end, so only the client can close it.
        const write = () => {
          while (res.write(chunk));
          res.once('drain', write);
        };
        write();
      };
    });
    await expect(
      conditionalGet({
        url: `${base}/big`,
        authorize,
        timeoutMs: 20_000,
        maxBytes: 1024,
      }),
    ).rejects.toMatchObject({ failure: 'size' });
    const open = sleep(1000, 'still open', { ref: false });
    await expect(Promise.race([closed, open])).resolves.toBe(
      'closed by the client',
    );
  });

  /** Answers at 400 ms, after the 200 ms limit of the calls below. */
  const lateAuthorize = () =>
    sleep(400, { Authorization: 'Bearer test-token' }, { ref: false });
  const late = {
    conditionalGet: (url: string) =>
      conditionalGet({
        url,
        authorize: lateAuthorize,
        timeoutMs: 200,
        maxBytes: 1024,
      }),
    postJson: (url: string) =>
      postJson({
        url,
        authorize: lateAuthorize,
        timeoutMs: 200,
        maxBytes: 1024,
        body: {},
      }),
    openStream: (url: string) =>
      openStream({ url, authorize: lateAuthorize, timeoutMs: 200 }),
  };
  const lateCalls: Array<keyof typeof late> = [
    'conditionalGet',
    'postJson',
    'openStream',
  ];

  it.each(lateCalls)(
    '%s fails as timeout within timeoutMs while authorize has not answered, and sends nothing on its late answer',
    async (call) => {
      routes['/path'] = (_, res) => res.writeHead(200).end('{}');
      const startedAt = Date.now();
      await expect(late[call](`${base}/path`)).rejects.toMatchObject({
        failure: 'timeout',
        message: 'authorize did not answer within 200 ms',
        hop: 'origin',
      });
      expect(Date.now() - startedAt).toBeLessThan(1000);
      await sleep(400);
      expect(received).toEqual([]);
    },
    5000,
  );
});

describe('openStream', () => {
  it('follows one redirect to the location without any authorize header', async () => {
    routes['/archive'] = (_, res) =>
      res.writeHead(302, { Location: `${base}/storage/a.tgz` }).end();
    routes['/storage/a.tgz'] = (_, res) => res.writeHead(200).end('archive');
    const body = await openStream({
      url: `${base}/archive`,
      authorize,
      timeoutMs: 1000,
      followRedirectWithoutCredentials: true,
    });
    expect((await collect(body)).toString()).toBe('archive');
    expect(received.map(({ url }) => url)).toEqual([
      '/archive',
      '/storage/a.tgz',
    ]);
    expect(received[0].headers.authorization).toBe('Bearer test-token');
    expect(received[1].headers).not.toHaveProperty('authorization');
    expect(received[1].headers).not.toHaveProperty('x-signature');
    expect(authorized).toEqual([{ method: 'GET', url: `${base}/archive` }]);
  });

  it('fails a second redirect as redirect', async () => {
    routes['/archive'] = (_, res) =>
      res.writeHead(302, { Location: '/hop' }).end();
    routes['/hop'] = (_, res) =>
      res.writeHead(302, { Location: '/storage/a.tgz' }).end();
    await expect(
      openStream({
        url: `${base}/archive`,
        authorize,
        timeoutMs: 1000,
        followRedirectWithoutCredentials: true,
      }),
    ).rejects.toMatchObject({
      failure: 'redirect',
      status: 302,
      hop: 'redirect',
    });
    expect(received.map(({ url }) => url)).toEqual(['/archive', '/hop']);
  });

  it.each<[string, Handler, object]>([
    [
      '403',
      (_, res) => res.writeHead(403).end(),
      { failure: 'refused', status: 403 },
    ],
    ['no answer within timeoutMs', () => {}, { failure: 'timeout' }],
    [
      'body stalled after its headers',
      (_, res) => res.writeHead(200).write('arch'),
      { failure: 'timeout' },
    ],
  ])(
    'fails a %s from the redirect target as a ChannelError of hop redirect',
    async (_, handler, expected) => {
      routes['/archive'] = (_, res) =>
        res.writeHead(302, { Location: '/storage/a.tgz' }).end();
      routes['/storage/a.tgz'] = handler;
      const read = openStream({
        url: `${base}/archive`,
        authorize,
        timeoutMs: 300,
        followRedirectWithoutCredentials: true,
      }).then(collect);
      await expect(read).rejects.toBeInstanceOf(ChannelError);
      await expect(read).rejects.toMatchObject({
        ...expected,
        hop: 'redirect',
      });
    },
  );

  it.each(['ftp://127.0.0.1/a.tgz', 'file:///etc/passwd', 'data:,archive'])(
    'fails a redirect to %s as redirect, never following it',
    async (location) => {
      routes['/archive'] = (_, res) =>
        res.writeHead(302, { Location: location }).end();
      await expect(
        openStream({
          url: `${base}/archive`,
          authorize,
          timeoutMs: 1000,
          followRedirectWithoutCredentials: true,
        }),
      ).rejects.toMatchObject({ failure: 'redirect', hop: 'origin' });
      expect(received).toHaveLength(1);
    },
  );

  it('fails a 302 as redirect without the option', async () => {
    routes['/archive'] = (_, res) =>
      res.writeHead(302, { Location: '/storage/a.tgz' }).end();
    await expect(
      openStream({ url: `${base}/archive`, authorize, timeoutMs: 1000 }),
    ).rejects.toMatchObject({
      failure: 'redirect',
      status: 302,
      hop: 'origin',
    });
    expect(received).toHaveLength(1);
  });

  it('fails a body that stalls past timeoutMs as timeout while it is read', async () => {
    routes['/archive'] = (_, res) => res.writeHead(200).write('arch');
    const body = await openStream({
      url: `${base}/archive`,
      authorize,
      timeoutMs: 300,
    });
    await expect(collect(body)).rejects.toMatchObject({
      failure: 'timeout',
      hop: 'origin',
    });
  });

  it('delivers every byte in order to a consumer that awaits a slow write per chunk', async () => {
    const sent = Buffer.alloc(4 * 1024 * 1024);
    for (let i = 0; i < sent.length; i++) sent[i] = i % 251;
    routes['/archive'] = (_, res) => res.writeHead(200).end(sent);
    const body = await openStream({
      url: `${base}/archive`,
      authorize,
      timeoutMs: 20_000,
    });
    const parts: Buffer[] = [];
    for await (const chunk of body) {
      await sleep(2);
      parts.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(parts).equals(sent)).toBe(true);
  });
});

describe('cappedChunks', () => {
  it('yields chunks up to maxBytes and throws size on the chunk that passes it', async () => {
    const seen: number[] = [];
    const chunks = cappedChunks(
      fromChunks([new Uint8Array(3), new Uint8Array(3), new Uint8Array(1)]),
      6,
    );
    await expect(
      (async () => {
        for await (const chunk of chunks) seen.push(chunk.byteLength);
      })(),
    ).rejects.toMatchObject({ failure: 'size' });
    expect(seen).toEqual([3, 3]);
  });
});

describe('createCheckInLoop', () => {
  type Answer = () => Promise<{ intervalMs?: number }>;

  const LOOP = {
    intervalMs: 30_000,
    jitter: 0.1,
    maxBackoffMs: 300_000,
    maxAnswerIntervalMs: 3_600_000,
    minGapMs: 10_000,
  };

  const answered =
    (intervalMs?: number): Answer =>
    async () =>
      intervalMs === undefined ? {} : { intervalMs };
  const failed =
    (error: unknown): Answer =>
    async () => {
      throw error;
    };

  function deferred() {
    let resolve: (value: { intervalMs?: number }) => void = () => {};
    const promise = new Promise<{ intervalMs?: number }>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  /** A loop whose n-th check-in answers answers[n], the last one repeated. */
  function loopWith(answers: Answer[], random: number) {
    const startedAt = Date.now();
    const times: number[] = [];
    const outcomes: unknown[] = [];
    const loop = createCheckInLoop({
      ...LOOP,
      random: () => random,
      checkIn: () => {
        const answer = answers[Math.min(times.length, answers.length - 1)];
        times.push(Date.now() - startedAt);
        return answer();
      },
      onOutcome: (outcome) => outcomes.push(outcome),
    });
    return { loop, times, outcomes };
  }

  const gaps = (times: number[]) =>
    times.slice(1).map((time, i) => time - times[i]);

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each<[string, CheckInResult, number, number]>([
    [
      'refused (401)',
      {
        ok: false,
        error: new ChannelError('HTTP 401', 'refused', { status: 401 }),
      },
      1,
      330_000,
    ],
    [
      'answered 429 with Retry-After 120 s',
      {
        ok: false,
        error: new ChannelError('HTTP 429', 'transport', {
          status: 429,
          retryAfterMs: 120_000,
        }),
      },
      0,
      120_000,
    ],
    [
      'failed (503)',
      {
        ok: false,
        error: new ChannelError('HTTP 503', 'transport', { status: 503 }),
      },
      1,
      60_000,
    ],
    [
      'answered with intervalMs 60 s',
      { ok: true, answer: { intervalMs: 60_000 } },
      0.5,
      60_000,
    ],
  ])(
    'after a check-in made before it that %s, runs the first one as after a check-in of its own',
    async (_, result, random, expected) => {
      const { loop, times, outcomes } = loopWith([answered()], random);
      loop.startAfter(result);
      await jest.advanceTimersByTimeAsync(expected - 1);
      expect(times).toEqual([]);
      await jest.advanceTimersByTimeAsync(1);
      expect(times).toEqual([expected]);
      expect(outcomes[0]).toEqual(
        result.ok
          ? { ok: true }
          : { ok: false, error: result.error, nextDelayMs: expected },
      );
      loop.stop();
    },
  );

  it('keeps the back-off when soon() is asked after a failed check-in made before it', async () => {
    const { loop, times } = loopWith([answered()], 1);
    loop.startAfter({ ok: false, error: new Error('fetch failed') });
    await jest.advanceTimersByTimeAsync(15_000);
    loop.soon();
    await jest.advanceTimersByTimeAsync(44_999);
    expect(times).toEqual([]);
    await jest.advanceTimersByTimeAsync(1);
    expect(times).toEqual([60_000]);
    loop.stop();
  });

  it.each<[string, number | undefined, number]>([
    ['an answer of 60 s', 60_000, 60_000],
    ['an answer without one', undefined, 30_000],
    ['an answer out of bounds', 29_999, 30_000],
  ])('takes its interval from %s', async (_, intervalMs, expected) => {
    const { loop } = loopWith([answered(intervalMs)], 0.5);
    expect(loop.intervalMs()).toBe(30_000);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(0);
    expect(loop.intervalMs()).toBe(expected);
    loop.stop();
  });

  it('runs the first check-in at the start delay', async () => {
    const { loop, times } = loopWith([answered()], 0.5);
    loop.start(5000);
    await jest.advanceTimersByTimeAsync(4999);
    expect(times).toEqual([]);
    await jest.advanceTimersByTimeAsync(1);
    expect(times).toEqual([5000]);
    loop.stop();
  });

  it.each([
    [1, 33_000],
    [0, 27_000],
    [0.5, 30_000],
  ])(
    'after a success with random %p runs the next check-in %i ms later',
    async (random, expected) => {
      const { loop, times } = loopWith([answered()], random);
      loop.start(0);
      await jest.advanceTimersByTimeAsync(expected);
      expect(gaps(times)).toEqual([expected]);
      loop.stop();
    },
  );

  it.each([
    [60_000, 60_000],
    [3_600_000, 3_600_000],
    [29_999, 30_000],
    [3_600_001, 30_000],
    [45_000.5, 30_000],
  ])(
    'takes an answer interval of %p ms as a next delay of %i ms',
    async (intervalMs, expected) => {
      const { loop, times } = loopWith([answered(intervalMs)], 0.5);
      loop.start(0);
      await jest.advanceTimersByTimeAsync(expected);
      expect(gaps(times)).toEqual([expected]);
      loop.stop();
    },
  );

  it('backs off after failures in a row by fullJitterDelay', async () => {
    const { loop, times } = loopWith([failed(new Error('fetch failed'))], 1);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(1_020_000);
    expect(gaps(times)).toEqual([60_000, 120_000, 240_000, 300_000, 300_000]);
    loop.stop();
  });

  it.each([
    [120_000, 120_000],
    [900_000, 300_000],
  ])(
    'raises the back-off to a Retry-After of %i ms, held at %i ms',
    async (retryAfterMs, expected) => {
      const error = new ChannelError('HTTP 429', 'transport', {
        status: 429,
        retryAfterMs,
      });
      const { loop, times } = loopWith([failed(error)], 0);
      loop.start(0);
      await jest.advanceTimersByTimeAsync(expected);
      expect(gaps(times)).toEqual([expected]);
      loop.stop();
    },
  );

  it('waits maxBackoffMs and its jitter after a refused check-in', async () => {
    const error = new ChannelError('HTTP 401', 'refused', { status: 401 });
    const { loop, times } = loopWith([failed(error)], 1);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(330_000);
    expect(gaps(times)).toEqual([330_000]);
    loop.stop();
  });

  it('calls onOutcome once per check-in, a failure with its next delay', async () => {
    const error = new Error('fetch failed');
    const { loop, outcomes } = loopWith([answered(), failed(error)], 1);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(33_000);
    expect(outcomes).toEqual([
      { ok: true },
      { ok: false, error, nextDelayMs: 60_000 },
    ]);
    loop.stop();
  });

  it('runs a check-in at once on soon() when the last one started minGapMs or more ago', async () => {
    const { loop, times } = loopWith([answered()], 0.5);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(15_000);
    loop.soon();
    await jest.advanceTimersByTimeAsync(0);
    expect(times).toEqual([0, 15_000]);
    loop.stop();
  });

  it('runs a check-in asked by soon() within minGapMs of the last start once the gap has passed', async () => {
    const { loop, times } = loopWith([answered()], 0.5);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(3000);
    loop.soon();
    loop.soon();
    await jest.advanceTimersByTimeAsync(6999);
    expect(times).toEqual([0]);
    await jest.advanceTimersByTimeAsync(1);
    expect(times).toEqual([0, 10_000]);
    loop.stop();
  });

  it('never runs a check-in asked by soon() beside a running one, and runs it after', async () => {
    const running = deferred();
    const { loop, times } = loopWith([() => running.promise, answered()], 0.5);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(12_000);
    loop.soon();
    await jest.advanceTimersByTimeAsync(1000);
    expect(times).toEqual([0]);
    running.resolve({});
    await jest.advanceTimersByTimeAsync(0);
    expect(times).toEqual([0, 13_000]);
    loop.stop();
  });

  it('keeps the back-off when soon() is asked after a failure', async () => {
    const { loop, times } = loopWith(
      [failed(new Error('fetch failed')), answered()],
      1,
    );
    loop.start(0);
    await jest.advanceTimersByTimeAsync(15_000);
    loop.soon();
    await jest.advanceTimersByTimeAsync(44_999);
    expect(times).toEqual([0]);
    await jest.advanceTimersByTimeAsync(1);
    expect(times).toEqual([0, 60_000]);
    loop.stop();
  });

  it('ends the schedule on stop()', async () => {
    const { loop, times } = loopWith([answered()], 0.5);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(0);
    loop.stop();
    loop.soon();
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(times).toEqual([0]);
  });

  it('schedules nothing and reports no outcome after a check-in that ends after stop()', async () => {
    const running = deferred();
    const { loop, times, outcomes } = loopWith([() => running.promise], 0.5);
    loop.start(0);
    await jest.advanceTimersByTimeAsync(0);
    loop.stop();
    running.resolve({});
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(times).toEqual([0]);
    expect(outcomes).toEqual([]);
  });
});

describe('a check-in loop whose authorize never answers', () => {
  it('reports a timeout within the request limit and backs off before the next attempt', async () => {
    const starts: number[] = [];
    const outcomes: Array<{ outcome: unknown; at: number }> = [];
    const loop = createCheckInLoop({
      intervalMs: 100,
      jitter: 0.1,
      maxBackoffMs: 1000,
      maxAnswerIntervalMs: 1000,
      minGapMs: 100,
      random: () => 0.5,
      checkIn: async () => {
        starts.push(Date.now());
        await postJson({
          url: `${base}/check-in`,
          authorize: () => new Promise<Record<string, string>>(() => {}),
          timeoutMs: 200,
          maxBytes: 1024,
          body: {},
        });
        return {};
      },
      onOutcome: (outcome) => outcomes.push({ outcome, at: Date.now() }),
    });
    loop.start(0);
    const deadline = Date.now() + 3000;
    while (starts.length < 2 && Date.now() < deadline) await sleep(20);
    loop.stop();
    expect(outcomes[0].outcome).toMatchObject({
      ok: false,
      error: { failure: 'timeout' },
      // fullJitterDelay(1) with random 0.5: 0.5 × min(1000, 100 × 2)
      nextDelayMs: 100,
    });
    expect(outcomes[0].at - starts[0]).toBeGreaterThanOrEqual(190);
    expect(outcomes[0].at - starts[0]).toBeLessThan(1000);
    expect(starts[1] - outcomes[0].at).toBeGreaterThanOrEqual(95);
    expect(received).toEqual([]);
  });
});
