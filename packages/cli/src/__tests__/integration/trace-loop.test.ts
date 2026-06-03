/**
 * Local end-to-end integration test for the server trace loop.
 *
 * The "server trace only works in deployed envs" caveat is only about real
 * Scaleway containers reaching a public observer. The runtime is just a Node
 * process, so the full loop IS testable locally with a stub observer.
 *
 * This test stands up a minimal Node `http` server playing the observer:
 *   GET  /trace/:id   -> returns `{ traceUntil: <seeded value> }`
 *   POST /ingest/:id  -> captures the posted FlowState records
 *
 * It then drives the REAL composition `pipeline.ts buildTelemetryObservers`
 * uses, over real HTTP, with the global `fetch`:
 *   createTracePoller (GET /trace/:id -> setTraceUntil holder write)
 *   createBatchedPoster (POST /ingest/:id)
 *   createTelemetryObserver(emit, () => resolveTelemetryOptions({ flowId,
 *     traceUntil: getTraceUntil() }))
 * The observer is registered on a real `Set<ObserverFn>` (the exact type of
 * `collector.observers`) and driven through a fan-out identical to the
 * runtime's `emitStep` (iterate the set, call each observer). Building a full
 * `Collector.Instance` to call the production `emitStep` would require a cast
 * (no public no-cast collector factory exists), which the project forbids, so
 * the 3-line fan-out is mirrored locally. Everything load-bearing for the loop
 * (poller, resolver, observer projection, poster, the holder, the HTTP hops)
 * is the production primitive, not a re-implementation.
 *
 * Loop exercised end to end: poll -> resolve -> emit -> ingest, across three
 * phases: trace OFF (null), trace ON (future timestamp), disable (back to
 * null).
 */
import { createServer, type IncomingMessage, type Server } from 'http';
import {
  createBatchedPoster,
  createMockLogger,
  createTelemetryObserver,
  getTraceUntil,
  resolveTelemetryOptions,
  setTraceUntil,
  type FlowState,
  type ObserverFn,
} from '@walkeros/core';
import { createTracePoller } from '../../runtime/trace-poller.js';

const TOKEN = 'tok_trace_test';
const DEPLOYMENT_ID = 'dep_trace_test';
const FLOW_ID = 'trace-loop-flow';
const STARTED_AT = Date.now();

/**
 * Mirror of the runtime's `emitStep` fan-out: synchronously dispatch a
 * FlowState to every registered observer. The production `emitStep` requires
 * a full `Collector.Instance`; reproducing its single-statement loop here
 * avoids minting one with a forbidden cast while still driving the real
 * registered observers.
 */
function emitToObservers(observers: Set<ObserverFn>, state: FlowState): void {
  for (const observer of observers) observer(state);
}

/** Read a request body fully into a string. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

interface StubObserver {
  base: string;
  /** Records posted to /ingest/:id, in arrival order, flattened across batches. */
  ingested: FlowState[];
  /** Flip the value the next GET /trace/:id returns. */
  setTraceUntil(value: string | null): void;
  close(): Promise<void>;
}

/**
 * Minimal local observer. Serves the deployment-keyed trace + ingest routes a
 * real container would hit, with the same Bearer-token auth contract.
 */
async function startStubObserver(): Promise<StubObserver> {
  let seededTraceUntil: string | null = null;
  const ingested: FlowState[] = [];

  const server: Server = createServer((req, res) => {
    void (async () => {
      const auth = req.headers['authorization'];
      if (auth !== `Bearer ${TOKEN}`) {
        res.writeHead(401);
        res.end();
        return;
      }

      const url = req.url ?? '';

      if (req.method === 'GET' && url === `/trace/${DEPLOYMENT_ID}`) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ traceUntil: seededTraceUntil }));
        return;
      }

      if (req.method === 'POST' && url === `/ingest/${DEPLOYMENT_ID}`) {
        const body = await readBody(req);
        const parsed: unknown = body.length > 0 ? JSON.parse(body) : [];
        if (Array.isArray(parsed)) {
          for (const record of parsed) {
            if (isFlowState(record)) ingested.push(record);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      res.writeHead(404);
      res.end();
    })().catch(() => {
      res.writeHead(500);
      res.end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('stub observer failed to bind a TCP port');
  }
  const base = `http://127.0.0.1:${address.port}`;

  return {
    base,
    ingested,
    setTraceUntil(value: string | null): void {
      seededTraceUntil = value;
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

/** Narrow a parsed JSON value to a FlowState (validates the load-bearing fields). */
function isFlowState(value: unknown): value is FlowState {
  if (typeof value !== 'object' || value === null) return false;
  if (!('flowId' in value) || !('eventId' in value)) return false;
  return typeof value.flowId === 'string' && typeof value.eventId === 'string';
}

/** Build a FlowState carrying full inEvent/outEvent (a trace-only payload). */
function buildState(eventId: string): FlowState {
  const now = Date.now();
  return {
    flowId: FLOW_ID,
    stepId: 'destination.api',
    stepType: 'destination',
    phase: 'out',
    eventId,
    timestamp: new Date(now).toISOString(),
    elapsedMs: now - STARTED_AT,
    inEvent: { name: 'order complete', data: { id: eventId } },
    outEvent: { mapped: true, id: eventId },
    mappingKey: 'order.complete',
  };
}

/** Poll a condition until true or time out. */
async function waitFor(cond: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('server trace loop (local, stub observer)', () => {
  let stub: StubObserver;
  let observers: Set<ObserverFn>;
  let observer: ObserverFn;

  beforeEach(async () => {
    jest.clearAllMocks();
    setTraceUntil(null);
    stub = await startStubObserver();

    // `collector.observers` is a `Set<ObserverFn>`; mirror that registration.
    observers = new Set<ObserverFn>();

    // The same composition as pipeline.ts `buildTelemetryObservers`: a batched
    // poster (POST to `${base}/ingest/${id}`) feeding a telemetry observer
    // whose options are re-resolved per emit from the shared `traceUntil`
    // holder. Default batch (50 records / 50 ms) just like the pipeline.
    const emit = createBatchedPoster({
      url: `${stub.base}/ingest/${DEPLOYMENT_ID}`,
      token: TOKEN,
    });
    observer = createTelemetryObserver(emit, () =>
      resolveTelemetryOptions({ flowId: FLOW_ID, traceUntil: getTraceUntil() }),
    );
    observers.add(observer);
  });

  afterEach(async () => {
    observers.clear();
    setTraceUntil(null);
    await stub.close();
  });

  function makePoller() {
    return createTracePoller(
      {
        url: `${stub.base}/trace/${DEPLOYMENT_ID}`,
        token: TOKEN,
        intervalMs: 15_000,
      },
      createMockLogger(),
    );
  }

  it('drives poll -> resolve -> emit -> ingest across off / on / disable', async () => {
    const poller = makePoller();

    // --- Phase 1: trace OFF (stub returns { traceUntil: null }) ---
    stub.setTraceUntil(null);
    await poller.pollOnce();
    expect(getTraceUntil()).toBeNull();

    // Emit a real FlowState through the registered observer. At baseline
    // (standard) level the projection strips inEvent/outEvent.
    emitToObservers(observers, buildState('evt-off'));

    // Wait for the batched poster's 50ms flush to POST to the stub.
    await waitFor(() => stub.ingested.some((s) => s.eventId === 'evt-off'));

    const offRecord = stub.ingested.find((s) => s.eventId === 'evt-off');
    expect(offRecord).toBeDefined();
    expect(offRecord?.flowId).toBe(FLOW_ID);
    // Baseline projection: NO full payloads.
    expect(offRecord?.inEvent).toBeUndefined();
    expect(offRecord?.outEvent).toBeUndefined();
    expect(offRecord?.mappingKey).toBeUndefined();

    // --- Phase 2: trace ON (stub returns a FUTURE traceUntil) ---
    const future = new Date(Date.now() + 60_000).toISOString();
    stub.setTraceUntil(future);
    await poller.pollOnce();
    expect(getTraceUntil()).toBe(future);

    emitToObservers(observers, buildState('evt-on'));
    await waitFor(() => stub.ingested.some((s) => s.eventId === 'evt-on'));

    const onRecord = stub.ingested.find((s) => s.eventId === 'evt-on');
    expect(onRecord).toBeDefined();
    // Trace projection: full inEvent/outEvent land at the stub.
    expect(onRecord?.inEvent).toEqual({
      name: 'order complete',
      data: { id: 'evt-on' },
    });
    expect(onRecord?.outEvent).toEqual({ mapped: true, id: 'evt-on' });
    expect(onRecord?.mappingKey).toBe('order.complete');

    // --- Phase 3: disable (stub flips back to { traceUntil: null }) ---
    stub.setTraceUntil(null);
    await poller.pollOnce();
    expect(getTraceUntil()).toBeNull();

    emitToObservers(observers, buildState('evt-disabled'));
    await waitFor(() =>
      stub.ingested.some((s) => s.eventId === 'evt-disabled'),
    );

    const disabledRecord = stub.ingested.find(
      (s) => s.eventId === 'evt-disabled',
    );
    expect(disabledRecord).toBeDefined();
    // Reverted to baseline: NO full payloads again.
    expect(disabledRecord?.inEvent).toBeUndefined();
    expect(disabledRecord?.outEvent).toBeUndefined();
    expect(disabledRecord?.mappingKey).toBeUndefined();
  });

  it('would go red if the supplier ignored the traceUntil holder', async () => {
    // Negative control proving the wiring is load-bearing: an observer whose
    // supplier hard-codes traceUntil: null stays at baseline even with a
    // future window in the holder. If the real supplier (which reads
    // getTraceUntil) were similarly broken, the ON phase above would fail.
    const ignoringEmit = createBatchedPoster({
      url: `${stub.base}/ingest/${DEPLOYMENT_ID}`,
      token: TOKEN,
    });
    const ignoringObserver = createTelemetryObserver(ignoringEmit, () =>
      resolveTelemetryOptions({ flowId: FLOW_ID, traceUntil: null }),
    );
    const ignoringSet = new Set<ObserverFn>([ignoringObserver]);

    const poller = makePoller();
    const future = new Date(Date.now() + 60_000).toISOString();
    stub.setTraceUntil(future);
    await poller.pollOnce();
    expect(getTraceUntil()).toBe(future);

    emitToObservers(ignoringSet, buildState('evt-ignored'));
    await waitFor(() => stub.ingested.some((s) => s.eventId === 'evt-ignored'));

    const record = stub.ingested.find((s) => s.eventId === 'evt-ignored');
    expect(record).toBeDefined();
    // traceUntil ignored -> baseline -> no full payloads despite the future
    // window in the holder.
    expect(record?.inEvent).toBeUndefined();
    expect(record?.outEvent).toBeUndefined();
  });
});
