import { createBatchedPoster, KEEPALIVE_BODY_BYTES } from '..';
import type {
  PosterFetch,
  PosterRequest,
  PosterResponse,
  PostResult,
} from '..';

const url = 'https://ingest.example.com/usage';
const token = 'wos_usage_aaaabbbbccccdddd_secret';

interface Call {
  url: string;
  init: PosterRequest;
  body: string;
}

/** An answer with a status and the headers it carries. */
function answer(
  status: number,
  headers: Record<string, string> = {},
): PosterResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] ?? null },
  };
}

/** A fetch that records every request and answers with `respond`. */
function recorder(
  respond: (index: number) => Promise<PosterResponse> = async () => answer(200),
) {
  const calls: Call[] = [];
  const fetch: PosterFetch = async (url, init) => {
    calls.push({ url, init, body: init.body });
    return respond(calls.length - 1);
  };
  return { calls, fetch };
}

function rowsOf(body: string): unknown[] {
  return body.split('\n').map((line): unknown => JSON.parse(line));
}

describe('createBatchedPoster', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends rows as NDJSON with the token as a Bearer header', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch });

    const result = await poster.send([{ seq: 1 }, { seq: 2 }]);

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].init).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-ndjson',
      },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    expect(rowsOf(calls[0].body)).toEqual([{ seq: 1 }, { seq: 2 }]);
  });

  // The usage report reads the outcome of its own request; nothing it can
  // meet makes the poster throw or reject.
  it.each<[string, () => Promise<PosterResponse>, PostResult]>([
    [
      'fetch rejects',
      async () => {
        throw new TypeError('fetch failed');
      },
      { ok: false, message: 'fetch failed' },
    ],
    [
      'a refusal with a ClickHouse code',
      async () => answer(500, { 'X-ClickHouse-Exception-Code': '201' }),
      { ok: false, status: 500, code: '201', message: 'responded 500' },
    ],
    [
      'a refusal without one',
      async () => answer(403),
      { ok: false, status: 403, message: 'responded 403' },
    ],
    [
      'fetch hangs past the timeout',
      () => new Promise<PosterResponse>(() => {}),
      { ok: false, message: 'no answer within 10000 ms' },
    ],
  ])('resolves %s as a failed result', async (_name, respond, expected) => {
    jest.useFakeTimers();
    const { fetch } = recorder(respond);
    const poster = createBatchedPoster({ url, token, fetch });

    const result = poster.send([{ seq: 1 }]);
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toEqual(expected);
  });

  it('hands every result to onResult, and a throwing onResult changes nothing', async () => {
    const results: PostResult[] = [];
    const { fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      onResult: (result) => {
        results.push(result);
        throw new Error('listener broke');
      },
    });

    await expect(poster.send([{ seq: 1 }])).resolves.toEqual({ ok: true });
    expect(results).toEqual([{ ok: true }]);
  });

  // A page leave's post outlives the page, so its caller judges it apart.
  it('tells onResult whether the post was a keepalive one', async () => {
    const posts: boolean[] = [];
    const { fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      onResult: (_result, { keepalive }) => posts.push(keepalive),
    });

    poster.push({ seq: 1 });
    await poster.flush();
    poster.push({ seq: 2 });
    await poster.flush(true);
    await poster.send([{ seq: 3 }]);

    expect(posts).toEqual([false, true, false]);
  });

  it.each<[string, () => unknown]>([
    ['a BigInt', () => ({ value: BigInt(1) })],
    [
      'a cycle',
      () => {
        const row: Record<string, unknown> = {};
        row.self = row;
        return row;
      },
    ],
  ])(
    'drops a row with %s, counts it and sends the rest',
    async (_name, bad) => {
      const { calls, fetch } = recorder();
      const poster = createBatchedPoster<unknown>({ url, token, fetch });

      expect(() => poster.push({ seq: 1 })).not.toThrow();
      expect(() => poster.push(bad())).not.toThrow();
      poster.push({ seq: 3 });
      await expect(poster.flush()).resolves.toBeUndefined();

      expect(rowsOf(calls[0].body)).toEqual([{ seq: 1 }, { seq: 3 }]);
      expect(poster.dropped()).toBe(1);
    },
  );

  it('splits a body at 60,000 bytes, rows in order', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch });
    const rows = [1, 2, 3].map((seq) => ({ seq, pad: 'x'.repeat(25_000) }));

    await poster.send(rows);

    expect(calls.map(({ body }) => rowsOf(body).length)).toEqual([2, 1]);
    expect(calls.flatMap(({ body }) => rowsOf(body))).toEqual(rows);
    for (const { body } of calls)
      expect(Buffer.byteLength(body)).toBeLessThanOrEqual(60_000);
  });

  it('keeps at most 500 waiting rows, dropping the oldest and counting them', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      batchSize: 1000,
      batchMs: 60_000,
    });

    for (let seq = 1; seq <= 502; seq++) poster.push({ seq });
    await poster.flush();

    const sent = calls.flatMap(({ body }) => rowsOf(body));
    expect(sent).toHaveLength(500);
    expect(sent[0]).toEqual({ seq: 3 });
    expect(poster.dropped()).toBe(2);
  });

  it('flushes a batch after batchMs, and at batchSize at once', async () => {
    jest.useFakeTimers();
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch, batchSize: 3 });

    poster.push({ seq: 1 });
    await jest.advanceTimersByTimeAsync(49);
    expect(calls).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);

    for (let seq = 2; seq <= 4; seq++) poster.push({ seq });
    await jest.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(rowsOf(calls[1].body)).toHaveLength(3);
  });

  it('sends a page-leave flush with keepalive, never credentials or a referrer', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch });

    poster.push({ seq: 1 });
    await poster.flush(true);

    expect(calls[0].init).toMatchObject({
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  });

  // Six rows of 40 bytes at a 100-byte body make three bodies of two rows.
  const sixRows = () =>
    [1, 2, 3, 4, 5, 6].map((seq) => ({ seq, pad: 'x'.repeat(26) }));

  it.each<[string, () => Promise<void>]>([
    [
      'one flush in flight, then one waiting turn for every row pushed meanwhile',
      async () => {
        const answers: Array<(response: PosterResponse) => void> = [];
        const { calls, fetch } = recorder(
          () => new Promise<PosterResponse>((resolve) => answers.push(resolve)),
        );
        const poster = createBatchedPoster({ url, token, fetch, batchSize: 1 });

        poster.push({ seq: 1 });
        poster.push({ seq: 2 });
        poster.push({ seq: 3 });
        void poster.flush();
        await jest.advanceTimersByTimeAsync(0);
        expect(calls).toHaveLength(1);

        answers[0](answer(200));
        await jest.advanceTimersByTimeAsync(0);
        expect(calls).toHaveLength(2);
        expect(rowsOf(calls[1].body)).toEqual([{ seq: 2 }, { seq: 3 }]);
      },
    ],
    [
      'a hang on the push and flush path, ended by the timeout aborting the request',
      async () => {
        const { calls, fetch } = recorder(
          () => new Promise<PosterResponse>(() => {}),
        );
        const results: PostResult[] = [];
        const poster = createBatchedPoster({
          url,
          token,
          fetch,
          onResult: (result) => results.push(result),
        });

        poster.push({ seq: 1 });
        const flushed = poster.flush();
        await jest.advanceTimersByTimeAsync(10_000);

        await expect(flushed).resolves.toBeUndefined();
        expect(calls[0].init.signal?.aborted).toBe(true);
        expect(results).toEqual([
          { ok: false, message: 'no answer within 10000 ms' },
        ]);
      },
    ],
    [
      'a single row above maxBodyBytes, sent alone',
      async () => {
        const { calls, fetch } = recorder();
        const poster = createBatchedPoster({
          url,
          token,
          fetch,
          maxBodyBytes: 100,
        });

        await poster.send([
          { seq: 1 },
          { seq: 2, pad: 'x'.repeat(200) },
          { seq: 3 },
        ]);

        expect(calls.map(({ body }) => rowsOf(body).length)).toEqual([1, 1, 1]);
        expect(rowsOf(calls[1].body)).toEqual([
          { seq: 2, pad: 'x'.repeat(200) },
        ]);
      },
    ],
  ])('handles %s', async (_name, scenario) => {
    jest.useFakeTimers();
    await scenario();
  });

  // The rest would meet the same answer, so their rows are counted as lost
  // instead of each waiting its own timeout; a body too large is per body.
  it.each<[string, () => Promise<PosterResponse>, number, number]>([
    ['no answer', () => new Promise<PosterResponse>(() => {}), 1, 4],
    ['a 429', async () => answer(429), 1, 4],
    ['a 503', async () => answer(503), 1, 4],
    ['a 413', async () => answer(413), 3, 0],
  ])(
    'after %s posts %i bodies and drops %i rows',
    async (_name, respond, bodies, dropped) => {
      jest.useFakeTimers();
      const { calls, fetch } = recorder(respond);
      const poster = createBatchedPoster({
        url,
        token,
        fetch,
        maxBodyBytes: 100,
      });

      const result = poster.send(sixRows());
      await jest.advanceTimersByTimeAsync(10_000);

      await expect(result).resolves.toMatchObject({ ok: false });
      expect(calls).toHaveLength(bodies);
      expect(poster.dropped()).toBe(dropped);
    },
  );

  it('takes a timeout per send', async () => {
    jest.useFakeTimers();
    const { fetch } = recorder(() => new Promise<PosterResponse>(() => {}));
    const poster = createBatchedPoster({ url, token, fetch });

    const result = poster.send([{ seq: 1 }], { timeoutMs: 3_000 });
    await jest.advanceTimersByTimeAsync(3_000);

    await expect(result).resolves.toEqual({
      ok: false,
      message: 'no answer within 3000 ms',
    });
  });

  it('answers a send with no row left to post as failed', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster<unknown>({ url, token, fetch });

    await expect(poster.send([{ value: BigInt(1) }])).resolves.toEqual({
      ok: false,
      message: 'no row could be serialized',
    });
    expect(calls).toEqual([]);
  });

  // Browsers keep about 64 KiB of keepalive bodies in flight, and the page is
  // gone before a first answer: one body leaves, so the older rows are
  // counted as lost.
  it('sends only the newest rows that fit one body on a page leave', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      maxBodyBytes: 100,
      batchSize: 1000,
    });

    for (const row of sixRows()) poster.push(row);
    await poster.flush(true);

    expect(calls).toHaveLength(1);
    expect(rowsOf(calls[0].body).map((row) => row)).toEqual(sixRows().slice(4));
    expect(poster.dropped()).toBe(4);
  });

  // A page shares 64 KiB of keepalive bodies with every destination.
  it('keeps a page leave body within 16,384 bytes, whatever maxBodyBytes says', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch, batchSize: 1000 });
    const rows = Array.from({ length: 60 }, (_, seq) => ({
      seq,
      pad: 'x'.repeat(980),
    }));
    for (const row of rows) poster.push(row);

    await poster.flush(true);

    expect(KEEPALIVE_BODY_BYTES).toBe(16_384);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.keepalive).toBe(true);
    // ASCII rows: each character is one byte.
    expect(calls[0].body.length).toBeLessThanOrEqual(16_384);
    const sent = rowsOf(calls[0].body);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent[sent.length - 1]).toEqual(rows[59]);
    expect(poster.dropped()).toBe(60 - sent.length);
  });

  // A row that alone exceeds the cap never fits: skipped and counted, while
  // the older rows still go.
  it('skips a newest row above the page-leave cap and keeps the older rows', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({ url, token, fetch, batchSize: 1000 });
    const small = Array.from({ length: 10 }, (_, seq) => ({ seq }));
    for (const row of small) poster.push(row);
    poster.push({ seq: 10, pad: 'x'.repeat(20_000) });

    await poster.flush(true);

    expect(calls).toHaveLength(1);
    expect(rowsOf(calls[0].body)).toEqual(small);
    expect(poster.dropped()).toBe(1);
  });

  it('names a page leave whose every row is above the cap', async () => {
    const results: PostResult[] = [];
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      onResult: (result) => results.push(result),
    });
    poster.push({ seq: 1, pad: 'x'.repeat(20_000) });

    await poster.flush(true);

    expect(calls).toEqual([]);
    expect(results).toEqual([
      { ok: false, message: 'no row fits a page-leave body of 16384 bytes' },
    ]);
    expect(poster.dropped()).toBe(1);
  });

  it('lets no caller header replace the token or the content type', async () => {
    const { calls, fetch } = recorder();
    const poster = createBatchedPoster({
      url,
      token,
      fetch,
      headers: {
        authorization: 'Bearer other',
        'CONTENT-TYPE': 'text/plain',
        'X-Extra': '1',
      },
    });

    await poster.send([{ seq: 1 }]);

    expect(calls[0].init.headers).toEqual({
      'X-Extra': '1',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-ndjson',
    });
  });
});
