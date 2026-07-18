import { createBatchedPoster } from '..';
import type { FlowState, PosterFetch, PosterResponse } from '..';

const URL = 'https://observer.example.com/ingest/dep_42';
const TOKEN = 'tok_secret_value';

function makeState(eventId = 'span_abc'): FlowState {
  return {
    flowId: 'flow_x',
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId,
    timestamp: new Date(0).toISOString(),
    elapsedMs: 0,
  };
}

interface CapturedCall {
  url: string;
  init: { method: string; headers: Record<string, string>; body: string };
}

interface FetchHarness {
  fetch: PosterFetch;
  calls: CapturedCall[];
  callCount: () => number;
}

function makeFetchHarness(
  responder: () => Promise<PosterResponse> | PosterResponse,
): FetchHarness {
  const calls: CapturedCall[] = [];
  const fetchImpl: PosterFetch = async (url, init) => {
    calls.push({ url, init });
    return responder();
  };
  return {
    fetch: fetchImpl,
    calls,
    callCount: () => calls.length,
  };
}

function ok(): PosterResponse {
  return { ok: true, status: 200 };
}

function fail(status: number): PosterResponse {
  return { ok: false, status };
}

interface IngestBody {
  v: number;
  records: FlowState[];
}

function readEnvelope(init: CapturedCall['init']): IngestBody {
  return JSON.parse(init.body);
}

function readBody(init: CapturedCall['init']): FlowState[] {
  return readEnvelope(init).records;
}

async function flushMicrotasks(times = 6): Promise<void> {
  // Drain enough ticks for: Promise.resolve -> then(fetch) -> await fetch
  // -> then(check)/catch(onError). 6 ticks is comfortably above a single
  // POST chain; split flushes await chunks sequentially and need more.
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('createBatchedPoster', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts a single FlowState after batchMs elapses', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState('span_1'));
    expect(harness.callCount()).toBe(0);

    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    expect(harness.calls[0].init.method).toBe('POST');
    expect(readBody(harness.calls[0].init)).toEqual([
      { ...makeState('span_1'), seq: 1 },
    ]);
  });

  it('posts immediately when batch size hits the cap', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 3,
      fetch: harness.fetch,
    });

    emit(makeState('a'));
    emit(makeState('b'));
    expect(harness.callCount()).toBe(0);
    emit(makeState('c'));
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    const body = readBody(harness.calls[0].init);
    expect(body).toHaveLength(3);
    expect(body[0].eventId).toBe('a');
    expect(body[2].eventId).toBe('c');
  });

  it('drops batch on fetch error without throwing', async () => {
    const harness = makeFetchHarness(async () => {
      throw new Error('network down');
    });
    const errors: unknown[] = [];
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onError: (e) => errors.push(e),
    });

    expect(() => emit(makeState())).not.toThrow();

    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.callCount()).toBe(1);
    expect(errors).toHaveLength(1);
    const err = errors[0];
    if (!(err instanceof Error)) throw new Error('Expected Error');
    expect(err.message).toBe('network down');
  });

  it('sets the Authorization Bearer header', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState());
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.calls[0].init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('sends Content-Type application/json and a versioned envelope body', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState('one'));
    emit(makeState('two'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    const headers = harness.calls[0].init.headers;
    expect(headers['Content-Type']).toBe('application/json');
    const envelope = readEnvelope(harness.calls[0].init);
    expect(envelope.v).toBe(1);
    expect(Array.isArray(envelope.records)).toBe(true);
    expect(envelope.records).toHaveLength(2);
  });

  it('reports non-2xx responses via onError without throwing', async () => {
    const harness = makeFetchHarness(async () => fail(500));
    const errors: unknown[] = [];
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onError: (e) => errors.push(e),
    });

    emit(makeState());
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(errors).toHaveLength(1);
    const err = errors[0];
    if (!(err instanceof Error)) throw new Error('Expected Error');
    expect(err.message).toBe('Observer responded 500');
  });

  it('wraps the batch in a versioned envelope {v:1, records}', async () => {
    const harness = makeFetchHarness(async () => ({
      ok: true,
      status: 202,
    }));
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchMs: 1,
      fetch: harness.fetch,
    });

    emit(makeState('span_env'));
    jest.advanceTimersByTime(1);
    await flushMicrotasks();

    const envelope = readEnvelope(harness.calls[0].init);
    expect(envelope.v).toBe(1);
    expect(Array.isArray(envelope.records)).toBe(true);
    expect(envelope.records[0]).toEqual({ ...makeState('span_env'), seq: 1 });
    // The envelope is the entire body: exactly the two wire fields.
    expect(Object.keys(envelope).sort()).toEqual(['records', 'v']);
  });

  it('merges opts.headers into every request with fixed headers winning', async () => {
    const harness = makeFetchHarness(async () => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      headers: {
        'X-Walkeros-Binding': 'pb_x',
        'Content-Type': 'text/plain',
        Authorization: 'Bearer forged',
      },
      fetch: harness.fetch,
    });

    emit(makeState('h1'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    emit(makeState('h2'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(harness.callCount()).toBe(2);
    for (const call of harness.calls) {
      // Custom header rides along on every request.
      expect(call.init.headers['X-Walkeros-Binding']).toBe('pb_x');
      // Fixed headers win on collision.
      expect(call.init.headers['Content-Type']).toBe('application/json');
      expect(call.init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    }
  });

  it('fires onStatus with the response status whenever a response exists', async () => {
    const log: string[] = [];
    // First response 401, second 200.
    let call = 0;
    const harness = makeFetchHarness(async () =>
      call++ === 0 ? fail(401) : ok(),
    );
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onStatus: (s) => log.push(`status:${s}`),
      onError: () => log.push('error'),
    });

    emit(makeState('s1'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    // onStatus fires before the non-2xx onError path.
    expect(log).toEqual(['status:401', 'error']);

    emit(makeState('s2'));
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    // Success responses fire onStatus too, with no error.
    expect(log).toEqual(['status:401', 'error', 'status:200']);
  });

  it('does not fire onStatus when the fetch rejects (no response exists)', async () => {
    const statuses: number[] = [];
    const errors: unknown[] = [];
    const harness = makeFetchHarness(async () => {
      throw new Error('network down');
    });
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
      onStatus: (s) => statuses.push(s),
      onError: (e) => errors.push(e),
    });

    emit(makeState());
    jest.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(statuses).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it('splits oversized batches into complete envelopes within maxBodyBytes', async () => {
    const harness = makeFetchHarness(async () => ok());
    // One stamped record serializes to ~160 bytes. 8 records exceed 400
    // bytes even before wrapping, forcing a recursive split; the limit is
    // enforced on the WRAPPED body.
    const maxBodyBytes = 400;
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 8,
      maxBodyBytes,
      fetch: harness.fetch,
    });

    for (let i = 0; i < 8; i++) {
      emit(makeState(`e${i}`));
    }
    await flushMicrotasks(40);

    expect(harness.callCount()).toBeGreaterThan(1);

    for (const call of harness.calls) {
      // Each split chunk is its own complete versioned envelope.
      const envelope = readEnvelope(call.init);
      expect(envelope.v).toBe(1);
      expect(Array.isArray(envelope.records)).toBe(true);
      expect(envelope.records.length).toBeGreaterThan(0);
      // Multi-record chunks respect the limit measured on the full wire
      // body including the wrapper (ASCII content: length equals bytes).
      if (envelope.records.length > 1) {
        expect(call.init.body.length).toBeLessThanOrEqual(maxBodyBytes);
      }
    }

    // Concatenation in call order preserves arrival order and seq.
    const flat = harness.calls.flatMap((c) => readBody(c.init));
    expect(flat.map((r) => r.eventId)).toEqual([
      'e0',
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6',
      'e7',
    ]);
    expect(flat.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
