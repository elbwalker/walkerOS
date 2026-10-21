import { Level, resolveDestinationTimeout } from '@walkeros/core';
import type {
  Destination,
  Elb,
  Logger,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { startFlow } from '..';

/**
 * An init that never settles is bounded by the step's timeout, like a push:
 * the pushes waiting for it answer `failed` with code `timeout` instead of
 * waiting forever, the next push starts a new attempt, and an attempt that
 * settles after its timeout installs nothing.
 */

type Line = { level: Level; message: string; context: Logger.LogContext };

function capture() {
  const lines: Line[] = [];
  const logger: Logger.Config = {
    handler: (level, message, context) => {
      lines.push({ level, message, context });
    },
  };
  // A cause's first line names the counter its repeats go to.
  const errors = (message: string) =>
    lines.filter(
      (line) => line.level === Level.ERROR && line.message.startsWith(message),
    );
  return { logger, errors };
}

/** A push's answer once it arrived, read after advancing the clock. */
function track(push: Promise<Elb.PushResult>) {
  let answer: Elb.PushResult | undefined;
  void push.then((result) => {
    answer = result;
  });
  return () => answer;
}

async function turns() {
  for (let turn = 0; turn < 100; turn++) await Promise.resolve();
}

/** Each init call is one attempt, settled by hand. */
function attempts<T>() {
  const started: Array<(value: T) => void> = [];
  const init = () =>
    new Promise<T>((resolve) => {
      started.push(resolve);
    });
  return { init, started };
}

const never = () => new Promise<never>(() => undefined);

describe('destination init timeout', () => {
  it('answers each push failed with code timeout once the destination timeout passes, with one ERROR line', async () => {
    const { logger, errors } = capture();
    const push = jest.fn();
    const destination: Destination.Instance = {
      type: 'hung',
      config: {},
      init: never,
      push,
    };
    const { collector, elb } = await startFlow({
      logger,
      destinations: { d: { code: destination, config: { timeout: 200 } } },
    });

    for (const name of ['page view', 'page read']) {
      const answer = track(elb(name));
      await jest.advanceTimersByTimeAsync(200);
      const result = answer();
      expect(result?.ok).toBe(false);
      expect(result?.failed?.d?.reason).toEqual(
        expect.objectContaining({ code: 'timeout', retryable: true }),
      );
    }

    expect(push).not.toHaveBeenCalled();
    expect(collector.destinations.d.config.init).toBeFalsy();
    expect(collector.status.destinations.d.failed).toBe(2);
    // One line for the cause; the repeat is counted.
    const lines = errors('destination init failed');
    expect(lines).toHaveLength(1);
    expect(lines[0].context.code).toBe('timeout');
  });

  it('settles every push parked behind the hung init with the same failure', async () => {
    const push = jest.fn();
    const destination: Destination.Instance = {
      type: 'hung',
      config: {},
      init: never,
      push,
    };
    const { collector, elb } = await startFlow({
      logger: { handler: () => undefined },
      destinations: { d: { code: destination, config: { timeout: 200 } } },
    });

    const answers = ['page view', 'page read', 'page scroll'].map((name) =>
      track(elb(name)),
    );
    await turns();
    expect(answers.map((answer) => answer())).toEqual([
      undefined,
      undefined,
      undefined,
    ]);

    await jest.advanceTimersByTimeAsync(200);

    for (const answer of answers) {
      expect(answer()?.ok).toBe(false);
      expect(answer()?.failed?.d?.reason).toEqual(
        expect.objectContaining({ code: 'timeout', retryable: true }),
      );
    }
    expect(push).not.toHaveBeenCalled();
    expect(collector.status.destinations.d.failed).toBe(3);
    expect(collector.destinations.d.queuePush ?? []).toHaveLength(0);
  });

  it('starts a new attempt on the next push; the stale attempt settling late installs nothing', async () => {
    const names: string[] = [];
    const { init, started } = attempts<Destination.Config>();
    const destination: Destination.Instance = {
      type: 'slow',
      config: {},
      init,
      push: (event: WalkerOS.Event) => {
        names.push(event.name);
      },
    };
    const { collector, elb } = await startFlow({
      logger: { handler: () => undefined },
      destinations: {
        d: {
          code: destination,
          config: { timeout: 200, settings: { attempt: 'none' } },
        },
      },
    });
    const d = collector.destinations.d;

    const first = track(elb('page view'));
    await jest.advanceTimersByTimeAsync(200);
    expect(first()?.failed?.d?.reason?.code).toBe('timeout');
    expect(started).toHaveLength(1);

    const second = track(elb('page read'));
    await turns();
    expect(started).toHaveLength(2);

    // The timed-out attempt settles now, with its own config.
    started[0]({ timeout: 200, settings: { attempt: 'stale' } });
    await turns();
    expect(d.config.init).toBeFalsy();
    expect(d.config.settings).toEqual({ attempt: 'none' });
    expect(second()).toBeUndefined();

    // The current attempt settles in time: its config is installed.
    started[1]({ timeout: 200, settings: { attempt: 'fresh' } });
    await turns();
    expect(second()?.ok).toBe(true);
    expect(d.config.init).toBe(true);
    expect(d.config.settings).toEqual({ attempt: 'fresh' });
    expect(names).toEqual(['page read']);
  });
});

describe('transformer init timeout', () => {
  // A transformer has no timeout setting: its init is bounded by the
  // default destination timeout.
  const timeout = resolveDestinationTimeout();

  it('fails the push with code timeout after the default timeout, retries on the next push, and ignores the stale attempt', async () => {
    const { logger, errors } = capture();
    const delivered: string[] = [];
    const { init, started } = attempts<Transformer.Config>();
    const enrich: Transformer.Instance = {
      type: 'enrich',
      config: {},
      init,
      push: (event) => ({ event }),
    };
    const sink: Destination.Instance = {
      type: 'sink',
      config: {},
      push: (event: WalkerOS.Event) => {
        delivered.push(event.name);
      },
    };
    const { collector, elb } = await startFlow({
      logger,
      next: 'enrich',
      transformers: { enrich: { code: async () => enrich } },
      destinations: { sink: { code: sink } },
    });

    const first = track(elb('page view'));
    await jest.advanceTimersByTimeAsync(timeout - 1);
    expect(first()).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    expect(first()?.ok).toBe(false);
    expect(first()?.reason).toEqual(
      expect.objectContaining({ code: 'timeout', retryable: true }),
    );
    const lines = errors('transformer init failed');
    expect(lines).toHaveLength(1);
    expect(lines[0].context.code).toBe('timeout');

    const second = track(elb('page read'));
    await turns();
    expect(started).toHaveLength(2);

    started[0]({ settings: { attempt: 'stale' } });
    await turns();
    expect(collector.transformers.enrich.config.init).toBeFalsy();
    expect(collector.transformers.enrich.config.settings).toBeUndefined();

    started[1]({ settings: { attempt: 'fresh' } });
    await turns();
    expect(second()?.ok).toBe(true);
    expect(collector.transformers.enrich.config.init).toBe(true);
    expect(collector.transformers.enrich.config.settings).toEqual({
      attempt: 'fresh',
    });
    expect(delivered).toEqual(['page read']);
  });
});
