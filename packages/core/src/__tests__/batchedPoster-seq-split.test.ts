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
  responder: (callIndex: number) => Promise<PosterResponse> | PosterResponse,
): FetchHarness {
  const calls: CapturedCall[] = [];
  const fetchImpl: PosterFetch = async (url, init) => {
    const index = calls.length;
    calls.push({ url, init });
    return responder(index);
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

/**
 * Drain a generous number of microtask ticks. A split flush chains
 * Promise.resolve -> fetch -> check per chunk and awaits chunks sequentially,
 * so several chunks need well above the single-POST tick count.
 */
async function drainMicrotasks(times = 40): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('createBatchedPoster seq + size split', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stamps a monotonic, gap-free seq across multiple flushes', async () => {
    const harness = makeFetchHarness(() => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 2,
      fetch: harness.fetch,
    });

    // Three flushes of two records each via the batchSize cap.
    for (let i = 0; i < 6; i++) {
      emit(makeState(`e${i}`));
    }
    await drainMicrotasks();

    expect(harness.callCount()).toBe(3);
    const seqs = harness.calls.flatMap((c) =>
      readBody(c.init).map((r) => r.seq),
    );
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not mutate the caller-provided record (spread copy)', async () => {
    const harness = makeFetchHarness(() => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 1,
      fetch: harness.fetch,
    });

    const original = makeState('shared');
    emit(original);
    await drainMicrotasks();

    expect(original.seq).toBeUndefined();
    expect(readBody(harness.calls[0].init)[0].seq).toBe(1);
  });

  it('leaves default behavior unchanged when no batch is oversized', async () => {
    const harness = makeFetchHarness(() => ok());
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      fetch: harness.fetch,
    });

    emit(makeState('one'));
    emit(makeState('two'));
    jest.advanceTimersByTime(50);
    await drainMicrotasks();

    expect(harness.callCount()).toBe(1);
    const body = readBody(harness.calls[0].init);
    expect(body).toHaveLength(2);
    expect(body.map((r) => r.seq)).toEqual([1, 2]);
  });

  it('splits an oversized batch into chunks that each fit the limit', async () => {
    const harness = makeFetchHarness(() => ok());
    // One stamped record serializes to ~160 bytes; pick a limit that holds a
    // couple of records but not the whole batch, forcing a recursive split.
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
    await drainMicrotasks();

    expect(harness.callCount()).toBeGreaterThan(1);

    // Every chunk parses to a complete versioned envelope; multi-record
    // chunks stay within the limit measured on the full wrapped body
    // (single-record chunks are allowed to exceed it).
    for (const call of harness.calls) {
      const envelope = readEnvelope(call.init);
      expect(envelope.v).toBe(1);
      expect(Array.isArray(envelope.records)).toBe(true);
      if (envelope.records.length > 1) {
        expect(call.init.body.length).toBeLessThanOrEqual(maxBodyBytes);
      }
    }

    // Concatenation in call order preserves arrival order and seq continuity.
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

  it('splits by UTF-8 byte size, not UTF-16 length', async () => {
    const harness = makeFetchHarness(() => ok());
    const maxBodyBytes = 700;

    // Each CJK char is one UTF-16 code unit but three UTF-8 bytes, so a
    // batch can be under the limit in .length while over it in wire bytes.
    const cjkPerRecord = 120;
    const recA = makeState('cjk0');
    recA.meta = { text: 'あ'.repeat(cjkPerRecord) };
    const recB = makeState('cjk1');
    recB.meta = { text: 'あ'.repeat(cjkPerRecord) };

    // Precondition: the stamped WRAPPED body (the split limit is enforced
    // on the full envelope serialization) is under the limit in UTF-16
    // code units but over it in UTF-8 bytes (each CJK char adds 2 extra
    // bytes).
    const stamped: FlowState[] = [
      { ...recA, seq: 1 },
      { ...recB, seq: 2 },
    ];
    const json = JSON.stringify({ v: 1, records: stamped });
    const utf8Bytes = json.length + 2 * (2 * cjkPerRecord);
    expect(json.length).toBeLessThanOrEqual(maxBodyBytes);
    expect(utf8Bytes).toBeGreaterThan(maxBodyBytes);

    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 2,
      maxBodyBytes,
      fetch: harness.fetch,
    });

    emit(recA);
    emit(recB);
    await drainMicrotasks();

    expect(harness.callCount()).toBe(2);
    const flat = harness.calls.flatMap((c) => readBody(c.init));
    expect(flat.map((r) => r.eventId)).toEqual(['cjk0', 'cjk1']);
    expect(flat.map((r) => r.seq)).toEqual([1, 2]);
  });

  it('sends a single over-limit record alone', async () => {
    const harness = makeFetchHarness(() => ok());
    const maxBodyBytes = 300;
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 1,
      maxBodyBytes,
      fetch: harness.fetch,
    });

    const fat = makeState('fat');
    fat.meta = { blob: 'x'.repeat(1000) };
    emit(fat);
    await drainMicrotasks();

    expect(harness.callCount()).toBe(1);
    const body = readBody(harness.calls[0].init);
    expect(body).toHaveLength(1);
    expect(body[0].eventId).toBe('fat');
    expect(harness.calls[0].init.body.length).toBeGreaterThan(maxBodyBytes);
  });

  it('POSTs oversized chunks sequentially (next fetch waits for the previous)', async () => {
    const calls: CapturedCall[] = [];
    const resolvers: Array<(r: PosterResponse) => void> = [];
    const fetchImpl: PosterFetch = (url, init) => {
      calls.push({ url, init });
      return new Promise<PosterResponse>((resolve) => {
        resolvers.push(resolve);
      });
    };

    // Small limit so two records split into two single-record chunks.
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 2,
      maxBodyBytes: 250,
      fetch: fetchImpl,
    });

    emit(makeState('a'));
    emit(makeState('b'));
    await drainMicrotasks();

    // Only the first chunk is in flight; the second must wait.
    expect(calls).toHaveLength(1);

    resolvers[0](ok());
    await drainMicrotasks();

    expect(calls).toHaveLength(2);
    expect(readBody(calls[0].init)[0].eventId).toBe('a');
    expect(readBody(calls[1].init)[0].eventId).toBe('b');

    resolvers[1](ok());
    await drainMicrotasks();
  });

  it('fires onError for a failing chunk without re-sequencing later records', async () => {
    // Fail only the first POST; every later POST succeeds.
    const harness = makeFetchHarness((index) =>
      index === 0 ? fail(500) : ok(),
    );
    const errors: unknown[] = [];
    const emit = createBatchedPoster({
      url: URL,
      token: TOKEN,
      batchSize: 2,
      maxBodyBytes: 250,
      fetch: harness.fetch,
      onError: (e) => errors.push(e),
    });

    // First flush: two records split into two single-record chunks; the first
    // chunk fails.
    emit(makeState('a'));
    emit(makeState('b'));
    await drainMicrotasks();

    expect(errors).toHaveLength(1);
    const err = errors[0];
    if (!(err instanceof Error)) throw new Error('Expected Error');
    expect(err.message).toBe('Observer responded 500');

    // Second flush: seq keeps climbing (no reset, no re-sequencing of the
    // dropped record).
    emit(makeState('c'));
    emit(makeState('d'));
    await drainMicrotasks();

    const flat = harness.calls.flatMap((c) => readBody(c.init));
    expect(flat.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
  });
});
