import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import { join } from 'path';
import { redactLine, type Collector } from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import type { PipelineOptions, runPipeline } from '../../pipeline.js';
import type { FlowHandle } from '../../runner.js';
import { ErrorRing, LogRing } from '../../log-ring.js';
import { counterSnapshot } from '../../heartbeat.js';
import { SecretRefusalError } from '../../secret-injection.js';
import {
  createChildReporter,
  runChild,
  type ParentLink,
} from '../../remote/child.js';
import type {
  ChildMessage,
  ChildStart,
  SupervisorMessage,
} from '../../remote/ipc.js';

const KNOWN = 'alpha-bravo-v16';
const DELIVERED = 'alpha-bravo-v17';

/** The parent end of the channel: what the child sent, and a way to talk to it. */
function fakeParent() {
  const sent: ChildMessage[] = [];
  let toChild: (message: SupervisorMessage) => void = () => {};
  let disconnected: () => void = () => {};
  const parent: ParentLink = {
    send: (message) => {
      sent.push(message);
    },
    onMessage: (listener) => {
      toChild = listener;
    },
    onDisconnect: (listener) => {
      disconnected = listener;
    },
  };
  return {
    parent,
    sent,
    deliver: (message: SupervisorMessage) => toChild(message),
    disconnect: () => disconnected(),
  };
}

/** A runPipeline stand-in that records its options, then does what `act` says. */
function pipelineDoing(act: (options: PipelineOptions) => Promise<void>) {
  const calls: PipelineOptions[] = [];
  const fn: typeof runPipeline = async (options) => {
    calls.push(options);
    await act(options);
  };
  return { fn, calls };
}

/**
 * What runPipeline does around its report once the flow is ready: it builds
 * the handle from the hook, starts it, flushes it on each new distinct error,
 * calls onReady, and then serves until the process ends.
 */
function serving(collector: FlowHandle['collector'] = { command: jest.fn() }) {
  return async (options: PipelineOptions): Promise<void> => {
    const handle = options.report?.(collector);
    handle?.start();
    options.errorRing?.setListener((_entry, isNew) => {
      if (isNew) handle?.flushSoon();
    });
    options.onReady?.();
    await new Promise<void>(() => {});
  };
}

function statusOf(): Collector.Status {
  return {
    startedAt: 0,
    in: 3,
    out: 2,
    failed: 1,
    sources: {},
    destinations: {
      api: {
        count: 2,
        failed: 1,
        duration: 40,
        queuePushSize: 0,
        dlqSize: 0,
      },
    },
    dropped: {},
    breakers: {},
    connectionErrors: {},
  };
}

/** Let the child's async steps run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('runChild', () => {
  let folder: string;
  let printed: string[];
  let start: ChildStart;

  beforeEach(() => {
    folder = mkdtempSync(join(os.tmpdir(), 'walkeros-child-test-'));
    printed = [];
    const print = (line: unknown) => {
      printed.push(String(line));
    };
    jest.spyOn(console, 'log').mockImplementation(print);
    jest.spyOn(console, 'error').mockImplementation(print);
    start = {
      type: 'start',
      instanceId: '3f9a2b7c1d4e5f60',
      sequence: 17,
      flowFile: join(folder, 'releases', '17', 'flow.mjs'),
      folder,
      port: 8080,
      values: { API_KEY: DELIVERED },
      known: [KNOWN],
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    rmSync(folder, { recursive: true, force: true });
  });

  function depsWith(fn: typeof runPipeline) {
    return { runPipeline: fn, exit: jest.fn(), kill: jest.fn() };
  }

  it('exits 1 with one ERROR when no start message comes within 10 s', async () => {
    jest.useFakeTimers();
    const { parent } = fakeParent();
    const deps = depsWith(pipelineDoing(serving()).fn);

    void runChild(parent, deps);
    await jest.advanceTimersByTimeAsync(9_999);
    expect(deps.exit).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    const line = 'No start message from the supervisor within 10 s';
    expect(deps.exit).toHaveBeenCalledWith(1);
    expect(printed).toEqual([expect.stringContaining(line)]);
    expect(redactLine(line)).toBe(line);
  });

  it("runs the release's flow on its port with its values, and no app", async () => {
    const { parent, deliver } = fakeParent();
    const pipeline = pipelineDoing(serving());

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await settle();

    expect(pipeline.calls).toHaveLength(1);
    const [options] = pipeline.calls;
    expect({
      bundlePath: options.bundlePath,
      port: options.port,
      instanceId: options.instanceId,
      delivered: options.delivered,
      api: options.api,
    }).toEqual({
      bundlePath: start.flowFile,
      port: 8080,
      instanceId: '3f9a2b7c1d4e5f60',
      delivered: { API_KEY: DELIVERED },
      api: undefined,
    });
  });

  it('masks every known and delivered value from the first line on', async () => {
    const { parent, deliver } = fakeParent();
    const pipeline = pipelineDoing(async (options) => {
      options.logger.info(`first line ${KNOWN} ${DELIVERED}`);
    });

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await settle();

    expect(printed).toEqual([expect.stringContaining('first line *** ***')]);
  });

  it("sinks errors into errors.jsonl in the start's folder, seeded from the one a previous child left", async () => {
    writeFileSync(
      join(folder, 'errors.jsonl'),
      `${JSON.stringify({ message: 'Earlier error', firstSeen: 1 })}\n`,
    );
    const seen: string[] = [];
    const pipeline = pipelineDoing(async (options) => {
      seen.push(...(options.errorRing?.snapshot() ?? []).map((e) => e.message));
      options.logger.error('Later error');
    });
    const { parent, deliver } = fakeParent();

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await settle();

    const sunk = readFileSync(join(folder, 'errors.jsonl'), 'utf8')
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line): unknown => JSON.parse(line));
    expect({ seen, sunk }).toEqual({
      seen: ['Earlier error'],
      sunk: [
        {
          message: expect.stringContaining('Later error'),
          firstSeen: expect.any(Number),
        },
      ],
    });
  });

  it('sends ready once the flow is ready', async () => {
    const { parent, deliver, sent } = fakeParent();

    void runChild(parent, depsWith(pipelineDoing(serving()).fn));
    deliver(start);
    await settle();

    expect(sent).toEqual([{ type: 'ready' }]);
  });

  it("sends the flow's own format once", async () => {
    const { parent, deliver, sent } = fakeParent();
    const pipeline = pipelineDoing(async (options) => {
      options.flowLogger?.onLogger({ format: 'json' });
      options.flowLogger?.onLogger({ format: 'json' });
    });

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await settle();

    expect(sent).toEqual([{ type: 'format', format: 'json' }]);
  });

  it.each<[string, Error, ChildMessage]>([
    [
      'a refusal of secret names sends the names',
      new SecretRefusalError([{ name: 'API_KEY', reason: 'secret-in-env' }]),
      {
        type: 'failed',
        message: 'Secrets refused: API_KEY (secret-in-env)',
        refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
      },
    ],
    [
      'any other failure sends its message masked',
      new Error(`connect with ${KNOWN} failed`),
      { type: 'failed', message: 'connect with *** failed' },
    ],
  ])('%s and exits 1', async (_case, error, failed) => {
    const { parent, deliver, sent } = fakeParent();
    const deps = depsWith(pipelineDoing(() => Promise.reject(error)).fn);

    void runChild(parent, deps);
    deliver(start);
    await settle();

    expect(sent).toEqual([failed]);
    expect(deps.exit).toHaveBeenCalledWith(1);
  });

  it('answers a report ask with one report: raw counters, errors and lines masked', async () => {
    const status = statusOf();
    const late = 'charlie-delta-late';
    let known = createKnownValues();
    const pipeline = pipelineDoing(async (options) => {
      known = options.knownValues;
      options.logger.error(`Push failed for ${late}`);
      options.logger.info(`Sent to ${late}`);
      await serving({ command: jest.fn(), status, release: 'dv_r17' })(options);
    });
    const { parent, deliver, sent } = fakeParent();

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await settle();
    known.add([late]);
    sent.length = 0;
    deliver({ type: 'report' });

    expect(sent).toEqual([
      {
        type: 'report',
        reason: 'asked',
        counters: counterSnapshot(status),
        release: 'dv_r17',
        errors: [
          expect.objectContaining({
            message: expect.stringContaining('Push failed for ***'),
          }),
        ],
        logs: expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: expect.stringContaining('Sent to ***'),
          }),
        ]),
      },
    ]);
    expect(JSON.stringify(sent)).not.toContain(late);
  });

  it('sends one new-error report after the debounce for a burst of new distinct errors', async () => {
    jest.useFakeTimers();
    let log: PipelineOptions['logger'] | undefined;
    const pipeline = pipelineDoing(async (options) => {
      log = options.logger;
      await serving()(options);
    });
    const { parent, deliver, sent } = fakeParent();

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await jest.advanceTimersByTimeAsync(0);
    log?.error('Push failed: one');
    log?.error('Push failed: two');
    log?.error('Push failed: three');
    await jest.advanceTimersByTimeAsync(1499);
    expect(sent.filter((m) => m.type === 'report')).toEqual([]);
    await jest.advanceTimersByTimeAsync(1);

    expect(sent.filter((m) => m.type === 'report')).toEqual([
      expect.objectContaining({ type: 'report', reason: 'new-error' }),
    ]);
  });

  it('sends no message per line in an error storm with no ask', async () => {
    jest.useFakeTimers();
    let log: PipelineOptions['logger'] | undefined;
    const pipeline = pipelineDoing(async (options) => {
      log = options.logger;
      await serving()(options);
    });
    const { parent, deliver, sent } = fakeParent();

    void runChild(parent, depsWith(pipeline.fn));
    deliver(start);
    await jest.advanceTimersByTimeAsync(0);
    for (let n = 0; n < 100; n++) log?.error(`Push failed: event ${n}`);
    await jest.advanceTimersByTimeAsync(10_000);

    expect(sent.map((m) => m.type)).toEqual(['ready', 'report']);
  });

  it.each<[string, boolean, 'kill' | 'exit', string]>([
    [
      'after ready raises SIGTERM in the process',
      true,
      'kill',
      'The supervisor disconnected; the flow drains',
    ],
    [
      'before ready exits 1',
      false,
      'exit',
      'The supervisor disconnected before the flow was ready',
    ],
  ])('a disconnect %s, with one ERROR', async (_case, ready, action, line) => {
    const pipeline = pipelineDoing(
      ready ? serving() : () => new Promise<void>(() => {}),
    );
    const { parent, deliver, disconnect } = fakeParent();
    const deps = depsWith(pipeline.fn);

    void runChild(parent, deps);
    deliver(start);
    await settle();
    disconnect();

    expect({ kill: deps.kill.mock.calls, exit: deps.exit.mock.calls }).toEqual(
      action === 'kill'
        ? { kill: [['SIGTERM']], exit: [] }
        : { kill: [], exit: [[1]] },
    );
    expect(printed).toEqual([expect.stringContaining(line)]);
    expect(redactLine(line)).toBe(line);
  });
});

describe('createChildReporter', () => {
  it('sends a report on sendOnce and none on a timer', async () => {
    jest.useFakeTimers();
    try {
      const sent: unknown[] = [];
      const reporter = createChildReporter({
        send: (report) => {
          sent.push(report);
        },
        getCounters: () => undefined,
        getErrors: () => new ErrorRing(20).snapshot(),
        getLogs: () => new LogRing(100).snapshot(),
        knownValues: createKnownValues(),
      });

      reporter.start();
      await jest.advanceTimersByTimeAsync(60_000);
      expect(sent).toEqual([]);
      await reporter.sendOnce();

      expect(sent).toEqual([
        { type: 'report', reason: 'asked', errors: [], logs: [] },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
