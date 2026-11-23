/**
 * The Observe reporter on a real collector, with the global fetch replaced
 * by a recorder: usage rows by the contract, preview rows per event and per
 * destination outcome, the failure matrix, masking and the shutdown bound.
 */
import type {
  Authorize,
  Collector,
  Destination,
  Logger,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { SHUTDOWN_DEADLINE_MS } from '@walkeros/core';
import { createCLILoggerConfig } from '@walkeros/core/node';
import { startFlow } from '..';

const usageUrl = 'https://ingest.example.com/usage';
const previewUrl = 'https://ingest.example.com/preview';
const token = 'usage-token-example';
const event = { name: 'page view', data: {} };

const USAGE_COLUMNS = [
  'code',
  'final',
  'instance',
  'interval_s',
  'is_gauge',
  'message',
  'metric',
  'name',
  'part',
  'release',
  'reported_at',
  'retryable',
  'seq',
  'status',
  'step',
  'value',
];

const PREVIEW_COLUMNS = [
  'event_id',
  'instance',
  'kind',
  'name',
  'outcome',
  'outcomes',
  'part',
  'payload',
  'release',
  'reported_at',
  'seq',
  'source',
  'timestamp',
  'trace_id',
];

type Row = Record<string, unknown>;

interface Answer {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
}

interface Request {
  url: string;
  init: {
    headers: Record<string, string>;
    /** Text with a token; the signed bytes with a host's `authorize`. */
    body: string | Uint8Array;
    keepalive?: boolean;
    signal?: AbortSignal;
  };
  rows: Row[];
}

function answer(status: number, headers: Record<string, string> = {}): Answer {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] ?? null },
  };
}

/** An answer that never comes, until the request is aborted. */
function hang(request: Request): Promise<Answer> {
  return new Promise<Answer>((_resolve, reject) => {
    request.init.signal?.addEventListener('abort', () =>
      reject(new Error('aborted')),
    );
  });
}

function rowsOf(body: string | Uint8Array): Row[] {
  // No TextDecoder under jsdom; Buffer reads the bytes as UTF-8.
  const text =
    typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
  return text.split('\n').map((line): Row => JSON.parse(line));
}

/** The global fetch of one test: records every request, answers with `respond`. */
function installFetch(
  respond: (request: Request) => Promise<Answer> = async () => answer(200),
) {
  const requests: Request[] = [];
  let open = 0;
  let maxOpen = 0;
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: async (url: string, init: Request['init']) => {
      const request: Request = { url, init, rows: rowsOf(init.body) };
      requests.push(request);
      open++;
      maxOpen = Math.max(maxOpen, open);
      try {
        return await respond(request);
      } finally {
        open--;
      }
    },
  });
  return { requests, maxOpen: () => maxOpen };
}

function sink(
  push: Destination.PushFn = () => undefined,
): Destination.Instance {
  return { type: 'sink', config: {}, push };
}

/** The value of one usage metric in a report, or undefined when left out. */
function metric(rows: Row[], step: string, name: string): unknown {
  return rows.find((row) => row.step === step && row.metric === name)?.value;
}

/** ERROR lines as a runner prints them: the message and its context. */
function errorLines() {
  const lines: Array<{ at: number; text: string }> = [];
  const handler: Logger.Handler = (_level, message, context) => {
    lines.push({
      at: Date.now(),
      text: `${message} ${JSON.stringify(context)}`,
    });
  };
  return { lines, logger: { level: 'ERROR' as const, handler } };
}

/** A flow file's options, read as JSON: no type stands between them and the check. */
function fromFile(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

beforeEach(() => {
  jest.useFakeTimers({ now: 1_700_000_000_000 });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'fetch');
  Reflect.deleteProperty(globalThis, '__WALKEROS_OBSERVE__');
  jest.useRealTimers();
});

describe('no options, no work', () => {
  it('starts no timer, adds no observer and never fetches without observe', async () => {
    const { requests } = installFetch();
    const { collector, elb } = await startFlow({
      destinations: { d: { code: sink() } },
    });
    // The collector's own timers, which run whatever the options say.
    const timers = jest.getTimerCount();

    await elb(event);
    await jest.advanceTimersByTimeAsync(600_000);

    expect(collector.reporter).toBeUndefined();
    expect(collector.observers.size).toBe(0);
    expect(jest.getTimerCount()).toBe(timers);
    expect(requests).toEqual([]);
  });

  it.each([
    [
      'an http url it cannot read',
      { usage: { url: 'ftp://x', token } },
      'observe.usage.url',
    ],
    [
      'an empty token',
      { usage: { url: usageUrl, token: '' } },
      'observe.usage.token',
    ],
    [
      'an interval below 10 seconds',
      { usage: { url: usageUrl, token, interval: 5 } },
      'observe.usage.interval',
    ],
    [
      'a key a part does not know',
      { preview: { url: previewUrl, token, level: 'trace' } },
      'observe.preview.level',
    ],
    [
      'a v1-shaped block',
      { level: 'trace', url: usageUrl, binding: 'b1' },
      'observe.level',
    ],
    [
      'a usage part with neither a token nor a host that signs',
      { usage: { url: usageUrl } },
      'observe.usage.token',
    ],
    [
      'a preview part without a token',
      { preview: { url: previewUrl } },
      'observe.preview.token',
    ],
  ])(
    'refuses %s with one ERROR line and does no work',
    async (_name, observe, path) => {
      const { requests } = installFetch();
      const { lines, logger } = errorLines();
      const { collector, elb } = await startFlow({
        logger,
        observe: fromFile(observe),
        destinations: { d: { code: sink() } },
      });

      const result = await elb(event);
      await jest.advanceTimersByTimeAsync(120_000);

      expect(result.ok).toBe(true);
      expect(lines).toEqual([
        { at: expect.any(Number), text: expect.stringContaining(path) },
      ]);
      expect(lines[0].text).not.toContain(token);
      expect(collector.reporter).toBeUndefined();
      expect(collector.observers.size).toBe(0);
      expect(requests).toEqual([]);
    },
  );

  it('logs that a build without the reporter ignores the block', async () => {
    globalThis.__WALKEROS_OBSERVE__ = false;
    const { requests } = installFetch();
    const { lines, logger } = errorLines();
    const { collector } = await startFlow({
      logger,
      observe: { usage: { url: usageUrl, token } },
    });
    await jest.advanceTimersByTimeAsync(120_000);

    expect(lines).toEqual([
      {
        at: expect.any(Number),
        text: expect.stringContaining(
          'observe: not in this build, config ignored',
        ),
      },
    ]);
    expect(collector.reporter).toBeUndefined();
    expect(requests).toEqual([]);
  });
});

describe('usage', () => {
  it('reports rows by the contract at once and every interval, cumulative and from seq 1', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      name: 'web',
      release: 'r1',
      observe: { usage: { url: usageUrl, token, interval: 10 } },
      destinations: { d: { code: sink() } },
    });
    await jest.advanceTimersByTimeAsync(0);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(usageUrl);
    expect(requests[0].init.headers.Authorization).toBe(`Bearer ${token}`);
    const first = requests[0].rows;
    for (const row of first)
      expect(Object.keys(row).sort()).toEqual(USAGE_COLUMNS);
    expect(first[0]).toMatchObject({
      seq: 1,
      final: 0,
      interval_s: 10,
      release: 'r1',
      part: 'web',
    });
    expect(String(first[0].instance)).toMatch(/^[0-9a-f]{16}$/);
    // collector.in marks every report; a counter at 0 is left out; gauges
    // go in at 0.
    expect(metric(first, 'collector', 'in')).toBe(0);
    expect(metric(first, 'collector', 'out')).toBeUndefined();
    expect(first.filter((row) => row.is_gauge === 1)).toEqual(
      ['queue', 'dlq', 'in_flight'].map((name) =>
        expect.objectContaining({
          step: 'destination.d',
          metric: name,
          value: 0,
        }),
      ),
    );

    await elb(event);
    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);
    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);

    expect(requests).toHaveLength(3);
    const [, second, third] = requests.map((request) => request.rows);
    expect(
      second.every(
        (row) => row.seq === 2 && row.instance === first[0].instance,
      ),
    ).toBe(true);
    expect(metric(second, 'collector', 'in')).toBe(2);
    expect(metric(second, 'destination.d', 'delivered')).toBe(2);
    expect(metric(third, 'collector', 'in')).toBe(3);
    expect(metric(third, 'collector', 'out')).toBe(3);
    expect(metric(third, 'destination.d', 'delivered')).toBe(3);
  });

  // Nothing may print the collector's config, but the tokens never reach it.
  it('keeps the tokens out of collector.config', async () => {
    installFetch();
    const { collector } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
    });

    expect(JSON.stringify(collector.config)).not.toContain(token);
    expect(collector.config).not.toHaveProperty('observe');
  });

  it('sends a final report on shutdown', async () => {
    const { requests } = installFetch();
    const { collector, elb } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
      destinations: { d: { code: sink() } },
    });
    await elb(event);

    await collector.command('shutdown');

    const last = requests[requests.length - 1].rows;
    expect(last.every((row) => row.final === 1)).toBe(true);
    expect(metric(last, 'collector', 'in')).toBe(1);
  });

  it('reports a new issue key within 1.5 s, and again in every report', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      observe: { usage: { url: usageUrl, token, interval: 60 } },
      destinations: {
        bad: {
          code: sink(() => {
            throw new Error('vendor refused the event');
          }),
        },
      },
    });
    await jest.advanceTimersByTimeAsync(0);
    await elb(event);
    await jest.advanceTimersByTimeAsync(1_500);

    expect(requests).toHaveLength(2);
    const issue = requests[1].rows.find((row) => row.metric === 'issue');
    // A plain throw from a push is a transport failure, which a retry can help.
    expect(issue).toMatchObject({
      step: 'destination.bad',
      code: 'transport',
      value: 1,
      retryable: 1,
      message: expect.stringContaining('vendor refused the event'),
    });

    await jest.advanceTimersByTimeAsync(60_000);
    expect(
      requests[2].rows.filter((row) => row.metric === 'issue'),
    ).toHaveLength(1);
  });

  it('counts a consent skip as skipped_consent and never as an issue', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      consentDenied: 'skip',
      observe: { usage: { url: usageUrl, token, interval: 10 } },
      destinations: {
        d: { code: sink(), config: { consent: { marketing: true } } },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);

    const rows = requests[requests.length - 1].rows;
    expect(metric(rows, 'destination.d', 'skipped_consent')).toBe(1);
    expect(rows.filter((row) => row.metric === 'issue')).toEqual([]);
  });

  it.each<
    [
      string,
      (request: Request) => Promise<Answer>,
      number | undefined,
      string | undefined,
    ]
  >([
    ['no answer', hang, undefined, undefined],
    ['401', async () => answer(401), 401, undefined],
    ['403', async () => answer(403), 403, undefined],
    ['413', async () => answer(413), 413, undefined],
    ['429', async () => answer(429), 429, undefined],
    [
      '500 with code 201',
      async () => answer(500, { 'X-ClickHouse-Exception-Code': '201' }),
      500,
      '201',
    ],
    ['502', async () => answer(502), 502, undefined],
  ])(
    'keeps delivering through %s, one request in flight and one ERROR line a minute',
    async (_name, respond, status, code) => {
      const { maxOpen } = installFetch(respond);
      const { lines, logger } = errorLines();
      const delivered: WalkerOS.Event[] = [];
      const { elb } = await startFlow({
        logger,
        observe: { usage: { url: usageUrl, token, interval: 10 } },
        destinations: {
          d: {
            code: sink((pushed) => {
              delivered.push(pushed);
            }),
          },
        },
      });

      const result = await elb(event);
      await jest.advanceTimersByTimeAsync(130_000);

      expect(result.ok).toBe(true);
      expect(delivered).toHaveLength(1);
      expect(maxOpen()).toBe(1);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < lines.length; i++)
        expect(lines[i].at - lines[i - 1].at).toBeGreaterThanOrEqual(60_000);
      expect(lines[0].text).toContain('usage');
      expect(lines[0].text).toContain('last success never');
      if (status !== undefined)
        expect(lines[0].text).toContain(`"status":${status}`);
      if (code !== undefined) expect(lines[0].text).toContain(`code ${code}`);
    },
  );

  // A paired runner's host signs each report with its credential's key; a
  // token in the flow file still wins.
  it.each<[string, { token?: string }, 'signed' | 'token']>([
    ['no token and a host that signs', {}, 'signed'],
    ['a token beside a host that signs', { token }, 'token'],
  ])('sends a report with %s', async (_name, own, sent) => {
    const { requests } = installFetch();
    const signed: Array<Uint8Array | undefined> = [];
    const authorize: Authorize = async ({ body }) => {
      signed.push(body);
      return { Signature: `sig${signed.length}` };
    };
    await startFlow({
      observe: { usage: { url: usageUrl, ...own, authorize, interval: 10 } },
    });
    await jest.advanceTimersByTimeAsync(10_000);

    expect(requests).toHaveLength(2);
    if (sent === 'signed') {
      expect(requests.map(({ init }) => init.headers)).toEqual([
        { Signature: 'sig1', 'Content-Type': 'application/x-ndjson' },
        { Signature: 'sig2', 'Content-Type': 'application/x-ndjson' },
      ]);
      expect(requests.map(({ init }) => init.body)).toEqual(signed);
    } else {
      expect(requests.map(({ init }) => init.headers.Authorization)).toEqual([
        `Bearer ${token}`,
        `Bearer ${token}`,
      ]);
      expect(signed).toEqual([]);
    }
    expect(requests[1].rows[0]).toMatchObject({ seq: 2 });
  });

  // A door that does not know the key yet answers 503 with a delay: the next
  // report comes after it, signed anew, once, and without a line until it
  // fails too.
  it('sends the next report after a 503 Retry-After delay, once', async () => {
    const { requests } = installFetch(async () =>
      answer(503, { 'Retry-After': '5' }),
    );
    const { lines, logger } = errorLines();
    let calls = 0;
    await startFlow({
      logger,
      observe: {
        usage: {
          url: usageUrl,
          authorize: async () => ({ Signature: `sig${++calls}` }),
          interval: 60,
        },
      },
    });

    await jest.advanceTimersByTimeAsync(4_999);
    expect(requests).toHaveLength(1);
    expect(lines).toEqual([]);
    await jest.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);
    expect(requests[1].init.headers.Signature).toBe('sig2');
    expect(lines).toEqual([
      {
        at: expect.any(Number),
        text: expect.stringContaining('responded 503'),
      },
    ]);
    await jest.advanceTimersByTimeAsync(54_999);
    expect(requests).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(3);
  });

  // A refused signature can come from a clock that is off; the answer's Date
  // names it beyond 5 s. Each report is cumulative, so the interval holds.
  it.each([
    ['30 seconds ahead', 30, ', clock offset 30 s'],
    ['5 seconds ahead', 5, ''],
  ])(
    'reports a 403 whose Date is %s as one ERROR line and keeps the interval',
    async (_name, ahead, note) => {
      const date = new Date(Date.now() + ahead * 1000).toUTCString();
      const { requests } = installFetch(async () =>
        answer(403, { Date: date }),
      );
      const { lines, logger } = errorLines();
      await startFlow({
        logger,
        observe: {
          usage: { url: usageUrl, authorize: async () => ({}), interval: 10 },
        },
      });

      await jest.advanceTimersByTimeAsync(9_999);
      expect(requests).toHaveLength(1);
      expect(lines.map(({ text }) => text)).toEqual([
        expect.stringContaining(
          `the data server refused the usage report: 403${note}, last success never`,
        ),
      ]);
      await jest.advanceTimersByTimeAsync(1);
      expect(requests).toHaveLength(2);
    },
  );

  it('reports a report that cannot be built as one ERROR line', async () => {
    installFetch();
    const { lines, logger } = errorLines();
    const { collector } = await startFlow({
      logger,
      observe: { usage: { url: usageUrl, token, interval: 10 } },
    });
    await jest.advanceTimersByTimeAsync(0);
    const causeLog = collector.causeLog;
    if (!causeLog) throw new Error('startFlow sets a cause log');
    causeLog.snapshot = () => {
      throw new Error('snapshot broke');
    };

    await jest.advanceTimersByTimeAsync(10_000);

    expect(lines).toEqual([
      {
        at: expect.any(Number),
        text: expect.stringContaining('report not built: snapshot broke'),
      },
    ]);
  });

  it('reports a new issue right after a report still in flight', async () => {
    const { requests } = installFetch(
      () =>
        new Promise<Answer>((resolve) =>
          setTimeout(() => resolve(answer(200)), 5_000),
        ),
    );
    const { elb } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      observe: { usage: { url: usageUrl, token, interval: 60 } },
      destinations: {
        bad: {
          code: sink(() => {
            throw new Error('vendor refused');
          }),
        },
      },
    });

    await jest.advanceTimersByTimeAsync(1_000);
    await elb(event);
    await jest.advanceTimersByTimeAsync(4_500);

    expect(requests).toHaveLength(2);
    expect(requests[1].rows.some((row) => row.metric === 'issue')).toBe(true);
  });

  // A batched destination keeps its status under `config.id`; its gauges
  // read the same name, so it is one series.
  it('names a destination by its config id in gauges and counters alike', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { usage: { url: usageUrl, token, interval: 10 } },
      destinations: {
        d: {
          code: {
            type: 'batched',
            config: {},
            push: () => undefined,
            pushBatch: () => undefined,
          },
          config: { id: 'renamed', batch: { wait: 60_000 } },
        },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);
    const waiting = requests[requests.length - 1].rows;
    expect(metric(waiting, 'destination.renamed', 'in_flight')).toBe(1);

    await elb('walker flush');
    await jest.advanceTimersByTimeAsync(10_000);
    const rows = requests[requests.length - 1].rows;
    expect(metric(rows, 'destination.renamed', 'delivered')).toBe(1);
    expect(metric(rows, 'destination.renamed', 'in_flight')).toBe(0);
    expect(rows.some((row) => row.step === 'destination.d')).toBe(false);
  });

  it('names an unbatched destination by its config id in every row', async () => {
    const { requests } = installFetch();
    let calls = 0;
    const { elb } = await startFlow({
      observe: { usage: { url: usageUrl, token, interval: 10 } },
      destinations: {
        d: {
          code: sink(() => {
            calls++;
            if (calls === 2) throw new Error('down');
          }),
          config: { id: 'renamed' },
        },
      },
    });

    await elb(event);
    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);
    const rows = requests[requests.length - 1].rows;

    expect(metric(rows, 'destination.renamed', 'delivered')).toBe(1);
    expect(metric(rows, 'destination.renamed', 'failed')).toBe(1);
    expect(metric(rows, 'destination.renamed', 'queue')).toBe(0);
    expect(metric(rows, 'destination.renamed', 'issue')).toBe(1);
    expect(
      rows.some(
        (row) =>
          row.step === 'destination.renamed' &&
          String(row.metric).startsWith('latency_ms_le_'),
      ),
    ).toBe(true);
    expect(rows.some((row) => row.step === 'destination.d')).toBe(false);
  });

  it('names a rule-not-applied issue of an unbatched destination by its config id', async () => {
    const { requests } = installFetch();
    // A before chain that renames a copy of the event onto another rule.
    const fork: Transformer.InitTransformers[string] = {
      code: async (context): Promise<Transformer.Instance> => ({
        type: 'fork',
        config: context.config,
        push: async (pushed) => [
          { event: { ...pushed } },
          { event: { ...pushed, name: 'product purchase' } },
        ],
      }),
    };
    const { elb } = await startFlow({
      observe: { usage: { url: usageUrl, token, interval: 10 } },
      transformers: { fork },
      destinations: {
        d: {
          code: sink(),
          before: ['fork'],
          config: {
            id: 'renamed',
            mapping: {
              page: { view: { name: 'pv' } },
              product: { purchase: { name: 'pp' } },
            },
          },
        },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);
    const issues = requests[requests.length - 1].rows.filter(
      (row) => row.metric === 'issue',
    );

    expect(issues).toEqual([
      expect.objectContaining({
        step: 'destination.renamed',
        code: 'rule-not-applied',
      }),
    ]);
  });

  // A host such as the runner writes the record; the collector only reports it.
  describe('runtime', () => {
    const runtime: Collector.RuntimeStatus = {
      memoryBytes: 212_000_000,
      memoryLimitBytes: 512_000_000,
      cpuMs: 1234,
      loopDelayMs: 56,
      loopSamples: 789,
    };

    /** The runtime rows of the report one interval after the host set `record`. */
    async function runtimeRows(record: Collector.RuntimeStatus) {
      const { requests } = installFetch();
      const { collector } = await startFlow({
        observe: { usage: { url: usageUrl, token, interval: 10 } },
      });
      collector.status.runtime = record;
      await jest.advanceTimersByTimeAsync(10_000);
      return requests[requests.length - 1].rows.filter(
        (row) => row.step === 'runtime',
      );
    }

    /** Each row's metric with its `[is_gauge, value]`. */
    function byMetric(rows: Row[]) {
      return Object.fromEntries(
        rows.map((row) => [row.metric, [row.is_gauge, row.value]]),
      );
    }

    it('sends the runtime record as five runtime rows', async () => {
      const rows = await runtimeRows(runtime);

      expect(rows).toHaveLength(5);
      expect(byMetric(rows)).toEqual({
        memory_bytes: [1, 212_000_000],
        memory_limit_bytes: [1, 512_000_000],
        cpu_ms: [0, 1234],
        loop_delay_ms: [0, 56],
        loop_samples: [0, 789],
      });
    });

    it('sends no runtime row while the record is unset', async () => {
      const { requests } = installFetch();
      await startFlow({
        observe: { usage: { url: usageUrl, token, interval: 10 } },
      });
      await jest.advanceTimersByTimeAsync(20_000);

      expect(requests).toHaveLength(3);
      expect(
        requests.some((request) =>
          request.rows.some((row) => row.step === 'runtime'),
        ),
      ).toBe(false);
    });

    // A counter at 0 is left out as every counter is; memory goes in always.
    it.each<[string, Collector.RuntimeStatus, Record<string, unknown>]>([
      [
        'no CPU time yet',
        { ...runtime, cpuMs: 0 },
        {
          memory_bytes: [1, 212_000_000],
          memory_limit_bytes: [1, 512_000_000],
          loop_delay_ms: [0, 56],
          loop_samples: [0, 789],
        },
      ],
      [
        'no event loop sample yet',
        { ...runtime, loopDelayMs: 0, loopSamples: 0 },
        {
          memory_bytes: [1, 212_000_000],
          memory_limit_bytes: [1, 512_000_000],
          cpu_ms: [0, 1234],
        },
      ],
    ])(
      'leaves a runtime counter at 0 out and keeps both gauges: %s',
      async (_case, record, expected) => {
        expect(byMetric(await runtimeRows(record))).toEqual(expected);
      },
    );
  });

  // One deadline for the whole stop: nothing goes after it.
  it('ends a shutdown with a beat hung in flight at 3 s, and sends nothing after', async () => {
    const { requests } = installFetch(hang);
    const { collector } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(1);

    let done = false;
    void collector.command('shutdown').then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(3_000);
    expect(done).toBe(true);
    await jest.advanceTimersByTimeAsync(30_000);

    expect(requests).toHaveLength(1);
  });

  it('aborts a final report that hangs on its own at the deadline', async () => {
    const { requests } = installFetch(async (request) =>
      request.rows.some((row) => row.final === 1) ? hang(request) : answer(200),
    );
    const { collector } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
    });
    await jest.advanceTimersByTimeAsync(0);

    void collector.command('shutdown');
    await jest.advanceTimersByTimeAsync(2_999);
    const final = requests[requests.length - 1];
    expect(final.rows.every((row) => row.final === 1)).toBe(true);
    expect(final.init.signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    expect(final.init.signal?.aborted).toBe(true);
  });

  it('flushes every destination batch on shutdown, then resolves within 3 s with a hung ingest', async () => {
    installFetch(hang);
    const flushed: number[] = [];
    const { collector, elb } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
      destinations: {
        b: {
          code: {
            type: 'batched',
            config: {},
            push: () => undefined,
            pushBatch: (batch) => {
              flushed.push(batch.entries.length);
            },
          },
          config: { batch: { wait: 60_000 } },
        },
      },
    });
    await elb(event);
    await elb(event);

    let done = false;
    void collector.command('shutdown').then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(2_999);
    expect(flushed).toEqual([2]);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('ends a stop at its deadline when less than its 3 s are left', async () => {
    installFetch(hang);
    const { collector } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
    });
    await jest.advanceTimersByTimeAsync(0);
    const reporter = collector.reporter;
    if (!reporter) throw new Error('no reporter');

    let done = false;
    void reporter.stop(Date.now() + 1_000).then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('leaves the last report only what a 7 s drain leaves of the shutdown deadline', async () => {
    installFetch(hang);
    const { collector } = await startFlow({
      observe: { usage: { url: usageUrl, token } },
    });
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    const http: Source.Instance = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: () => wait(4_000),
    };
    collector.sources['http'] = http;
    collector.destinations['slow'] = {
      type: 'slow',
      config: {},
      push: () => undefined,
      destroy: () => wait(3_000),
    };
    await jest.advanceTimersByTimeAsync(0);

    let done = false;
    void collector.command('shutdown').then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(SHUTDOWN_DEADLINE_MS - 1);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

describe('preview', () => {
  const preview = {
    url: previewUrl,
    token: 'wos_preview_aaaabbbbccccdddd_secret',
  };

  function previewRows(requests: Request[]): Row[] {
    return requests.flatMap((request) => request.rows);
  }

  it('sends one event row and one outcome row per destination', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      release: 'r1',
      observe: { preview },
      destinations: { d1: { code: sink() }, d2: { code: sink() } },
    });

    const result = await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);

    const rows = previewRows(requests);
    for (const row of rows)
      expect(Object.keys(row).sort()).toEqual(PREVIEW_COLUMNS);
    const eventRow = rows.find((row) => row.kind === 'event');
    expect(eventRow).toMatchObject({
      event_id: result.event?.id,
      name: 'page view',
      outcome: 'done',
      release: 'r1',
    });
    expect(JSON.parse(String(eventRow?.payload))).toMatchObject({
      name: 'page view',
    });
    const outcomes = rows.filter((row) => row.kind === 'outcome');
    expect(
      outcomes
        .map((row) => JSON.parse(String(row.outcomes))[0].destination)
        .sort(),
    ).toEqual(['d1', 'd2']);
    expect(
      outcomes.every(
        (row) => row.payload === '' && row.event_id === result.event?.id,
      ),
    ).toBe(true);
    expect(rows.map((row) => row.seq).sort()).toEqual([1, 2, 3]);
  });

  it('flushes at 100 rows at once, before the 2 s window', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: { d: { code: sink() } },
    });

    for (let i = 0; i < 50; i++) await elb(event);
    await jest.advanceTimersByTimeAsync(0);

    expect(previewRows(requests)).toHaveLength(100);
  });

  it('adds an outcome row when a consent grant releases a held event', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: {
        d: { code: sink(), config: { consent: { marketing: true } } },
      },
    });

    const result = await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(
      previewRows(requests).find((row) => row.kind === 'event'),
    ).toMatchObject({ outcome: 'queued' });

    await elb('walker consent', { marketing: true });
    await jest.advanceTimersByTimeAsync(2_000);

    expect(
      previewRows(requests).find(
        (row) =>
          row.kind === 'outcome' &&
          row.event_id === result.event?.id &&
          row.outcome === 'done',
      ),
    ).toBeDefined();
  });

  /** The outcome rows of one destination, in seq order. */
  function outcomesOf(
    rows: Row[],
    destination: string,
  ): Array<[unknown, unknown]> {
    return rows
      .filter((row) => row.kind === 'outcome')
      .sort((a, b) => Number(a.seq) - Number(b.seq))
      .map((row) => JSON.parse(String(row.outcomes))[0])
      .filter((element) => element.destination === destination)
      .map((element) => [element.outcome, element.code]);
  }

  const batched = (): Destination.Instance => ({
    type: 'batched',
    config: {},
    push: () => undefined,
    pushBatch: () => undefined,
  });

  it('reads a batched destination as queued until its flush, then done', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: {
        b: { code: batched(), config: { batch: { wait: 1_000 } } },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(3_000);

    expect(outcomesOf(previewRows(requests), 'b')).toEqual([
      ['queued', 'batch'],
      ['done', ''],
    ]);
  });

  it('reads a consent-held batched event as queued, queued again when released, then done', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: {
        b: {
          code: batched(),
          config: { batch: { wait: 1_000 }, consent: { marketing: true } },
        },
      },
    });

    await elb(event);
    await elb('walker consent', { marketing: true });
    await jest.advanceTimersByTimeAsync(3_000);

    const states = outcomesOf(previewRows(requests), 'b');
    expect(states[states.length - 1]).toEqual(['done', '']);
    expect(states.slice(0, -1).every(([outcome]) => outcome === 'queued')).toBe(
      true,
    );
  });

  it.each([
    ['a nanosecond', 1.7e18],
    ['a microsecond', 1.7e15],
  ])(
    'keeps the row of an event with %s time, at the record time',
    async (_name, timestamp) => {
      const { requests } = installFetch();
      const { elb } = await startFlow({
        observe: { preview },
        destinations: { d: { code: sink() } },
      });

      await elb({ ...event, timestamp });
      await jest.advanceTimersByTimeAsync(2_000);

      const row = previewRows(requests).find(
        (candidate) => candidate.kind === 'event',
      );
      expect(String(row?.timestamp)).toMatch(
        /^20\d\d-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/,
      );
    },
  );

  it('carries the collector reason of a push that failed before any destination', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      observe: { preview },
      transformers: {
        broken: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'broken',
            config: context.config,
            push: () => {
              throw new Error('transformer broke');
            },
          }),
        },
      },
      next: 'broken',
      destinations: { d: { code: sink() } },
    });

    const result = await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);

    expect(result.ok).toBe(false);
    const row = previewRows(requests).find(
      (candidate) =>
        candidate.kind === 'event' && candidate.outcome === 'failed',
    );
    expect(JSON.parse(String(row?.outcomes))).toEqual([
      expect.objectContaining({
        destination: '',
        outcome: 'failed',
        code: result.reason?.code,
      }),
    ]);
  });

  it('makes no outcome row for a destination init failure, which has no event', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      observe: { preview },
      destinations: {
        d: {
          code: {
            type: 'd',
            config: {},
            init: () => {
              throw new Error('init broke');
            },
            push: () => undefined,
          },
        },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);

    expect(previewRows(requests).some((row) => row.event_id === '')).toBe(
      false,
    );
  });

  it('reads an event that every destination skipped as skipped', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      consentDenied: 'skip',
      observe: { preview },
      destinations: {
        d: { code: sink(), config: { consent: { marketing: true } } },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);

    expect(
      previewRows(requests).find((row) => row.kind === 'event'),
    ).toMatchObject({
      outcome: 'skipped',
    });
  });

  it('reads an event held before walker run as queued for run, then done after it', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      run: false,
      observe: { preview },
      destinations: { d: { code: sink() } },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(2_000);
    const held = previewRows(requests).filter((row) => row.kind === 'event');
    expect(held).toEqual([expect.objectContaining({ outcome: 'queued' })]);
    expect(JSON.parse(String(held[0].outcomes))).toEqual([
      expect.objectContaining({
        destination: '',
        outcome: 'queued',
        code: 'run',
      }),
    ]);

    await elb('walker run');
    await jest.advanceTimersByTimeAsync(2_000);
    const events = previewRows(requests).filter((row) => row.kind === 'event');
    expect(events.map((row) => row.outcome)).toEqual(['queued', 'done']);
    expect(events[1].event_id).toBe(held[0].event_id);
  });

  it('starts the page-leave post before a slow destination flush ends', async () => {
    const { requests } = installFetch();
    let release: () => void = () => undefined;
    const { elb } = await startFlow({
      observe: { preview },
      destinations: {
        b: {
          code: {
            ...batched(),
            pushBatch: () =>
              new Promise<void>((resolve) => {
                release = resolve;
              }),
          },
          config: { batch: { wait: 60_000 } },
        },
      },
    });
    await elb(event);

    void elb('walker flush');
    await jest.advanceTimersByTimeAsync(0);

    expect(requests.map((request) => request.init.keepalive)).toEqual([true]);
    release();
  });

  // Browsers keep about 64 KiB of keepalive bodies in flight: one body of the
  // newest rows leaves, and the older rows show as missing seq values.
  it('sends one keepalive body of the newest rows on walker flush', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: { d: { code: sink() } },
    });
    const large = { name: 'page view', data: { pad: 'x'.repeat(5_000) } };

    for (let i = 0; i < 20; i++) await elb(large);
    await elb('walker flush');
    await jest.advanceTimersByTimeAsync(0);

    expect(requests).toHaveLength(1);
    expect(requests[0].init.keepalive).toBe(true);
    const seqs = requests[0].rows.map((row) => Number(row.seq));
    expect(Math.max(...seqs)).toBe(40);
    expect(Math.min(...seqs)).toBeGreaterThan(1);
  });

  it('posts the waiting rows with keepalive on walker flush', async () => {
    const { requests } = installFetch();
    const { elb } = await startFlow({
      observe: { preview },
      destinations: { d: { code: sink() } },
    });

    await elb(event);
    await elb('walker flush');
    await jest.advanceTimersByTimeAsync(0);

    expect(requests).toHaveLength(1);
    expect(requests[0].init.keepalive).toBe(true);
  });

  // The in record holds the event as the source pushed it, before the flow's
  // own steps: a page-leave row carries no payload, so no redaction is skipped.
  it('posts no payload in a page-leave row, so a source.next redaction holds', async () => {
    const { requests } = installFetch();
    let release: () => void = () => undefined;
    const answer = new Promise<void>((resolve) => {
      release = resolve;
    });
    const probe: Source.Init<
      Source.Types<unknown, unknown, Collector.PushFn>
    > = async (context) => ({
      type: 'probe',
      config: context.config,
      push: context.env.push,
    });
    const redact: Transformer.InitTransformers[string] = {
      code: async (context): Promise<Transformer.Instance> => ({
        type: 'redact',
        config: context.config,
        push: async (pushed) => {
          const data = { ...pushed.data };
          delete data.email;
          return { event: { ...pushed, data } };
        },
      }),
    };
    // With a source, startFlow's elb is the source's push: the flush goes
    // through the collector's command.
    const { collector } = await startFlow({
      observe: { preview },
      sources: { form: { code: probe, next: 'redact' } },
      transformers: { redact },
      destinations: { d: { code: sink(() => answer) } },
    });

    const pushed = collector.sources.form.push({
      name: 'form submit',
      data: { email: 'tester@example.com', plan: 'pro' },
    });
    await jest.advanceTimersByTimeAsync(0);
    await collector.command('flush');
    await jest.advanceTimersByTimeAsync(0);

    expect(requests).toHaveLength(1);
    expect(requests[0].init.body).not.toContain('tester@example.com');
    expect(requests[0].rows.find((row) => row.kind === 'event')).toMatchObject({
      name: 'form submit',
      outcome: 'queued',
      payload: '',
    });

    release();
    await pushed;
  });

  // A page leave's request outlives the page, while the page's own promise
  // rejects as it unloads: a keepalive post that failed without a status says
  // nothing about the ingest.
  it.each<[string, boolean, boolean, (request: Request) => Promise<Answer>]>([
    [
      'a keepalive post without a status',
      false,
      true,
      async (request) => {
        if (request.init.keepalive) throw new TypeError('Failed to fetch');
        return answer(200);
      },
    ],
    [
      'a keepalive post with a status',
      true,
      true,
      async (request) => answer(request.init.keepalive ? 503 : 200),
    ],
    [
      'a regular post without a status',
      true,
      false,
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])('reports %s as failed: %s', async (_name, logged, keepalive, respond) => {
    const { requests } = installFetch(respond);
    const { lines, logger } = errorLines();
    const { elb } = await startFlow({
      logger,
      observe: { preview },
      destinations: { d: { code: sink() } },
    });

    await elb(event);
    if (keepalive) await elb('walker flush');
    await jest.advanceTimersByTimeAsync(2_000);

    expect(requests.map((request) => !!request.init.keepalive)).toEqual([
      keepalive,
    ]);
    expect(
      lines.some((line) => line.text.includes('Observe preview report failed')),
    ).toBe(logged);
  });

  // A page that leaves before a push settles never makes its row: the
  // page-leave flush reports it as queued, and its settled row, if the page
  // lives on, takes a higher seq.
  it.each([
    ['in flight at the leave', true],
    ['settled before the leave', false],
  ])(
    'reports a push %s once in the keepalive body',
    async (_name, inFlight) => {
      const { requests } = installFetch();
      let release: () => void = () => undefined;
      const answer = new Promise<void>((resolve) => {
        release = resolve;
      });
      const { elb } = await startFlow({
        observe: { preview },
        destinations: {
          d: { code: sink(() => (inFlight ? answer : undefined)) },
        },
      });
      const eventRows = () =>
        previewRows(requests).filter((row) => row.kind === 'event');

      const pushed = elb(event);
      if (!inFlight) await pushed;
      await jest.advanceTimersByTimeAsync(0);
      await elb('walker flush');
      await jest.advanceTimersByTimeAsync(0);

      expect(requests).toHaveLength(1);
      expect(requests[0].init.keepalive).toBe(true);
      const left = eventRows();
      expect(left).toEqual([
        expect.objectContaining({
          name: 'page view',
          outcome: inFlight ? 'queued' : 'done',
        }),
      ]);
      if (inFlight) {
        expect(JSON.parse(String(left[0].outcomes))).toEqual([
          expect.objectContaining({
            destination: '',
            outcome: 'queued',
            code: 'page-leave',
          }),
        ]);
        expect(left[0].payload).toBe('');
      }

      await elb('walker flush');
      await jest.advanceTimersByTimeAsync(0);
      expect(eventRows()).toHaveLength(1);

      release();
      await pushed;
      await jest.advanceTimersByTimeAsync(2_000);
      const rows = eventRows();
      if (inFlight) {
        expect(rows.map((row) => row.outcome)).toEqual(['queued', 'done']);
        expect(rows[1].event_id).toBe(rows[0].event_id);
        expect(Number(rows[1].seq)).toBeGreaterThan(Number(rows[0].seq));
      } else {
        expect(rows).toHaveLength(1);
      }
    },
  );
});

describe('masking', () => {
  // A known value with no pattern shape: only the host's mask hides it, on
  // the path createCLILoggerConfig({ knownSecrets }) -> config.logger.mask ->
  // collector.logger.mask -> the posted row.
  const secret = 'hunter2plainpw';
  const bearer = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlMTIz';

  it('posts an issue message and a preview outcome message with the known value masked', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { requests } = installFetch();
    const { elb } = await startFlow({
      logger: createCLILoggerConfig({ knownSecrets: [secret], silent: true }),
      observe: {
        usage: { url: usageUrl, token, interval: 10 },
        preview: { url: previewUrl, token },
      },
      destinations: {
        bad: {
          code: sink(() => {
            throw new Error(
              `refused ${secret} with Authorization: Bearer ${bearer} ${'x'.repeat(400)}`,
            );
          }),
        },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);

    const issue = requests
      .filter((request) => request.url === usageUrl)
      .flatMap((request) => request.rows)
      .find((row) => row.metric === 'issue');
    const outcome = requests
      .filter((request) => request.url === previewUrl)
      .flatMap((request) => request.rows)
      .find((row) => row.kind === 'outcome');
    const outcomeMessage: unknown = JSON.parse(String(outcome?.outcomes))[0]
      .message;

    for (const message of [issue?.message, outcomeMessage]) {
      expect(typeof message).toBe('string');
      expect(String(message)).toContain('refused *** with');
      expect(String(message)).not.toContain(secret);
      expect(String(message)).not.toContain(bearer);
      expect(String(message).length).toBeLessThanOrEqual(256);
    }
  });

  // A host's mask is host code: when it throws, a message goes empty, never
  // unmasked, and the flow starts as usual.
  it('posts empty messages when the mask throws, and still starts the flow', async () => {
    const { requests } = installFetch();
    const { lines, logger } = errorLines();
    const { elb } = await startFlow({
      logger: {
        ...logger,
        mask: () => {
          throw new Error('mask broke');
        },
      },
      observe: fromFile({
        usage: { url: usageUrl, token, interval: 10 },
        preview: { url: 'ftp://not-http', token },
      }),
      destinations: {
        bad: {
          code: sink(() => {
            throw new Error(`refused ${secret}`);
          }),
        },
      },
    });

    await elb(event);
    await jest.advanceTimersByTimeAsync(10_000);

    expect(
      lines.some((line) => line.text.includes('observe.preview.url')),
    ).toBe(true);
    expect(lines.map((line) => line.text).join('\n')).not.toContain(
      'ftp://not-http',
    );
    const issue = requests
      .flatMap((request) => request.rows)
      .find((row) => row.metric === 'issue');
    expect(issue?.message).toBe('');
  });
});
