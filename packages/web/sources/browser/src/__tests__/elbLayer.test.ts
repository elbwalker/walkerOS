import { createPushResult } from '@walkeros/collector';
import { isObject, isString } from '@walkeros/core';
import type { Elb } from '@walkeros/core';
import { createElbLayer } from '../elbLayer';
import type { Context, Settings } from '../types';
import { flushChain as flush } from './test-utils';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const defer = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const settings = (): Settings => ({
  prefix: 'data-elb',
  scope: document,
  pageview: false,
  elb: '',
  elbLayer: 'elbLayer',
});

const okResult = (): Elb.PushResult => createPushResult({ ok: true });

// A fake translation context: a spyable `elb` (both commands and events land
// here through the real translation) and a spyable `initScope` for `walker
// init`. Types are inferred from the jest.fn implementations, no casts.
const makeHarness = () => {
  const elb = jest.fn((_event?: unknown, _data?: unknown) =>
    Promise.resolve(okResult()),
  );
  const initScope = jest.fn((_context: Context) => {});
  const context: Context = { elb, settings: settings(), initScope };

  // Labels every elb dispatch in call order: a `walker *` command keeps its
  // string, an event object collapses to its `name`.
  const dispatchLabels = (): string[] =>
    elb.mock.calls.map(([arg0]) => {
      if (isString(arg0)) return arg0;
      if (isObject(arg0) && isString(arg0.name)) return arg0.name;
      return '?';
    });

  return { context, elb, initScope, dispatchLabels };
};

const setLayer = (value: unknown[]): void => {
  Reflect.set(window, 'elbLayer', value);
};

const getLayer = (): unknown[] | undefined => {
  const value = Reflect.get(window, 'elbLayer');
  return Array.isArray(value) ? value : undefined;
};

const clearLayer = (): void => {
  Reflect.set(window, 'elbLayer', undefined);
};

const pushLayer = (entry: unknown): number => {
  const layer = getLayer();
  if (!layer) throw new Error('elbLayer missing');
  return layer.push(entry);
};

describe('createElbLayer controller', () => {
  beforeEach(() => {
    clearLayer();
  });

  afterEach(() => {
    clearLayer();
  });

  test('never mutates the layer array (append-only)', async () => {
    setLayer([
      ['walker consent', { functional: true }],
      ['foo bar', {}],
    ]);

    const { context } = makeHarness();
    const controller = createElbLayer(context, { window });
    controller.start();
    await flush();

    const layer = getLayer();
    expect(layer).toHaveLength(2);
    expect(layer?.[0]).toEqual(['walker consent', { functional: true }]);
    expect(layer?.[1]).toEqual(['foo bar', {}]);
  });

  test('two lanes: backlog command dispatches before start, event waits for start', async () => {
    setLayer([
      ['walker consent', { functional: true }],
      ['foo bar', {}],
    ]);

    const { context, dispatchLabels } = makeHarness();
    const controller = createElbLayer(context, { window });
    await flush();

    // Command lane runs immediately; the event lane is recorded but idle.
    expect(dispatchLabels()).toEqual(['walker consent']);

    controller.start();
    await flush();

    // Event now replays, strictly after the command.
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);
  });

  test('walker init from the layer reaches initScope with a scope-aligned context', async () => {
    setLayer([]);

    const { context, initScope } = makeHarness();
    createElbLayer(context, { window });

    const el = document.createElement('div');
    pushLayer(['walker init', el]);
    await flush();

    expect(initScope).toHaveBeenCalledTimes(1);
    const passedContext = initScope.mock.calls[0][0];
    expect(passedContext.settings.scope).toBe(el);
  });

  test('post-start entries serialize across lanes in push order', async () => {
    setLayer([]);
    const { context, elb, dispatchLabels } = makeHarness();
    const deferreds: Deferred<Elb.PushResult>[] = [];
    elb.mockImplementation(() => {
      const d = defer<Elb.PushResult>();
      deferreds.push(d);
      return d.promise;
    });

    const controller = createElbLayer(context, { window });
    controller.start();
    await flush();

    pushLayer(['foo bar', { id: 'A' }]); // event A
    pushLayer(['walker consent', { marketing: true }]); // command
    pushLayer(['bar baz', { id: 'B' }]); // event B
    await flush();

    // The chain blocks on A's pending dispatch; nothing races ahead.
    expect(dispatchLabels()).toEqual(['foo bar']);

    deferreds[0].resolve(okResult());
    await flush();
    expect(dispatchLabels()).toEqual(['foo bar', 'walker consent']);

    deferreds[1].resolve(okResult());
    await flush();
    expect(dispatchLabels()).toEqual(['foo bar', 'walker consent', 'bar baz']);

    deferreds[2].resolve(okResult());
    await flush();
  });

  test('pre-start commands serialize in push order', async () => {
    setLayer([]);
    const { context, elb, dispatchLabels } = makeHarness();
    const deferreds: Deferred<Elb.PushResult>[] = [];
    elb.mockImplementation(() => {
      const d = defer<Elb.PushResult>();
      deferreds.push(d);
      return d.promise;
    });

    createElbLayer(context, { window });

    pushLayer(['walker consent', { marketing: true }]);
    pushLayer(['walker user', { id: 'u1' }]);
    await flush();

    // Second command waits on the first via the command chain.
    expect(dispatchLabels()).toEqual(['walker consent']);

    deferreds[0].resolve(okResult());
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent', 'walker user']);

    deferreds[1].resolve(okResult());
    await flush();
  });

  test('normalizes and routes arguments-object entries', async () => {
    setLayer([]);
    const { context, elb } = makeHarness();
    const controller = createElbLayer(context, { window });
    controller.start();
    await flush();

    (function pushArgs(..._args: unknown[]) {
      pushLayer(arguments);
    })('foo bar', { data: 1 });
    await flush();

    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'foo bar', data: { data: 1 } }),
    );
  });

  test('start is idempotent and tolerates a route that pushes mid-dispatch', async () => {
    setLayer([['foo bar', { id: 'X' }]]);
    const { context, elb, dispatchLabels } = makeHarness();
    let reentered = false;
    elb.mockImplementation((arg0?: unknown) => {
      if (isObject(arg0) && arg0.name === 'foo bar' && !reentered) {
        reentered = true;
        // Synchronously enqueue a new event from inside the running dispatch.
        pushLayer(['bar baz', { id: 'Y' }]);
      }
      return Promise.resolve(okResult());
    });

    const controller = createElbLayer(context, { window });
    controller.start();
    controller.start(); // second start must not replay the backlog again
    await flush();

    const labels = dispatchLabels();
    expect(labels.filter((label) => label === 'foo bar')).toHaveLength(1);
    expect(labels).toEqual(['foo bar', 'bar baz']);
  });

  test('intake resolves the dispatch result post-start and ok:true pre-start', async () => {
    setLayer([]);
    const { context, elb } = makeHarness();
    const controller = createElbLayer(context, { window });

    // Pre-start event: recorded, resolves ok:true without dispatching.
    const preResult = await controller.intake(['foo bar', {}]);
    expect(preResult.ok).toBe(true);
    expect(elb).not.toHaveBeenCalled();

    // Post-start: intake resolves to the actual dispatch result.
    const sentinel = createPushResult({ ok: true });
    elb.mockImplementation(() => Promise.resolve(sentinel));
    controller.start();
    await flush();

    const postResult = await controller.intake(['baz qux', {}]);
    expect(postResult).toBe(sentinel);
  });

  test('destroy restores native push: entries append without routing', async () => {
    setLayer([]);
    const { context, elb } = makeHarness();
    const controller = createElbLayer(context, { window });
    controller.destroy();

    const newLength = pushLayer(['foo bar', {}]);
    await flush();

    expect(newLength).toBe(1);
    expect(getLayer()).toHaveLength(1);
    expect(elb).not.toHaveBeenCalled();
  });

  test('second start() is a no-op — replays nothing, chain order intact', async () => {
    setLayer([]);
    const { context, dispatchLabels } = makeHarness();
    const controller = createElbLayer(context, { window });
    controller.start();
    await flush();

    pushLayer(['foo bar', { id: 'X' }]); // delivered once, post-start
    await flush();
    expect(dispatchLabels()).toEqual(['foo bar']);

    // Second start() short-circuits on the started flag: no replay, no re-seed
    // of tail, chain order preserved. (Simulates a second walker run.)
    controller.start();
    await flush();
    expect(dispatchLabels()).toEqual(['foo bar']);
  });

  test('start seeds the chain from the command lane', async () => {
    setLayer([
      ['walker consent', { marketing: true }],
      ['foo bar', {}],
    ]);
    const { context, elb, dispatchLabels } = makeHarness();
    const commandDeferred = defer<Elb.PushResult>();
    let firstCall = true;
    elb.mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return commandDeferred.promise; // hold the pre-start command
      }
      return Promise.resolve(okResult());
    });

    const controller = createElbLayer(context, { window });
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent']);

    controller.start();
    await flush();
    // Event stays blocked behind the unresolved command.
    expect(dispatchLabels()).toEqual(['walker consent']);

    commandDeferred.resolve(okResult());
    await flush();
    // Event dispatches strictly after the command completes.
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);
  });

  test('a rejected enqueue does not wedge the shared chain', async () => {
    setLayer([]);
    const { context } = makeHarness();
    const controller = createElbLayer(context, { window });
    controller.start();
    await flush();

    // A rejecting unit of work. Catch the returned link so the rejection is
    // observed here (no unhandled-rejection noise) and callers still see it.
    const rejected = controller.enqueue(() =>
      Promise.reject(new Error('boom')),
    );
    const rejection = rejected.catch((error: unknown) => error);

    // A following unit of work queued strictly behind the rejected one.
    let followUpRan = false;
    const followUp = controller.enqueue(() => {
      followUpRan = true;
      return 'done';
    });

    await flush();

    // The rejection surfaces to the awaiting caller of the rejected enqueue...
    expect(await rejection).toEqual(new Error('boom'));
    // ...but the shared chain continues: the follow-up still runs and resolves.
    expect(followUpRan).toBe(true);
    expect(await followUp).toBe('done');
  });

  test('enqueue runs after a replayed backlog event', async () => {
    setLayer([['foo bar', {}]]);
    const { context, elb } = makeHarness();
    const order: string[] = [];
    const eventDeferred = defer<Elb.PushResult>();
    elb.mockImplementation(() => {
      order.push('event');
      return eventDeferred.promise; // hold the replayed event
    });

    const controller = createElbLayer(context, { window });
    controller.start();
    const enqueued = controller.enqueue(() => {
      order.push('enqueue');
    });
    await flush();

    // Event dispatch started; enqueue is queued behind it.
    expect(order).toEqual(['event']);

    eventDeferred.resolve(okResult());
    await enqueued;
    await flush();
    expect(order).toEqual(['event', 'enqueue']);
  });

  test('recreate on the same window resumes past the drained boundary', async () => {
    setLayer([]);
    const { context, dispatchLabels } = makeHarness();

    // First controller drains both lanes: the command runs on intake, the
    // event replays on start().
    const first = createElbLayer(context, { window });
    await first.intake(['walker consent', { functional: true }]);
    await first.intake(['foo bar', { id: 'A' }]);
    first.start();
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);

    first.destroy();

    // A new controller adopts the SAME append-only window.elbLayer. It must
    // resume past what the first controller already drained, not replay from 0.
    const second = createElbLayer(context, { window });
    second.start();
    await flush();

    // Neither the prior command nor the prior event re-routes.
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);

    // An entry pushed after the recreate still routes normally.
    await second.intake(['baz qux', { id: 'B' }]);
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar', 'baz qux']);
  });

  test('recreate after a pre-start destroy replays held events exactly once', async () => {
    setLayer([
      ['walker consent', { functional: true }],
      ['foo bar', { id: 'A' }],
    ]);
    const { context, dispatchLabels } = makeHarness();

    // First controller runs the backlog command immediately but is destroyed
    // before start(), so its event lane never drains.
    const first = createElbLayer(context, { window });
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent']);
    first.destroy();

    // The recreate must NOT re-run the already-dispatched command, but MUST
    // replay the still-undrained event exactly once.
    const second = createElbLayer(context, { window });
    second.start();
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);
  });

  test('repeated destroy/recreate cycles never replay a drained entry', async () => {
    setLayer([]);
    const { context, dispatchLabels } = makeHarness();

    let controller = createElbLayer(context, { window });
    await controller.intake(['walker consent', {}]);
    await controller.intake(['foo bar', {}]);
    controller.start();
    await flush();
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);

    // Three further create/start cycles on the same array add nothing.
    for (let i = 0; i < 3; i++) {
      controller.destroy();
      controller = createElbLayer(context, { window });
      controller.start();
      await flush();
    }
    expect(dispatchLabels()).toEqual(['walker consent', 'foo bar']);
  });
});
