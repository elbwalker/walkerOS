import type { Destination, FlowState, WalkerOS } from '@walkeros/core';
import {
  createIngest,
  isEnvObserve,
  isObject,
  OBSERVE_ENV_KEY,
} from '@walkeros/core';
import { startFlow } from '..';

/**
 * Typed env for the fake destination: a single observable callable at
 * `api.track` so `wrapEnv` can intercept the dot-path `api.track`.
 */
interface ApiEnv extends Destination.BaseEnv {
  api: { track: (...args: unknown[]) => void };
}
type ApiTypes = Destination.Types<unknown, unknown, ApiEnv>;

type ObserveLevel = 'off' | 'standard' | 'trace';

interface FlowHandles {
  collector: Awaited<ReturnType<typeof startFlow>>['collector'];
  states: FlowState[];
  trackCalls: unknown[][];
  originalTrack: (...args: unknown[]) => void;
  getReceivedTrackRef: () => unknown;
}

/**
 * Builds a flow with one no-op destination that invokes `env.api.track` on
 * every push. `declareCalls` toggles the `calls` declaration on the code;
 * `observeLevel` optionally installs the supplier; `pushArgs` customizes what
 * the destination forwards to `track`.
 */
async function buildApiFlow(opts: {
  declareCalls?: boolean;
  observeLevel?: ObserveLevel;
  pushArgs?: (event: WalkerOS.Event) => unknown[];
  throwAfterTrack?: boolean;
}): Promise<FlowHandles> {
  const states: FlowState[] = [];
  const trackCalls: unknown[][] = [];
  const originalTrack = (...args: unknown[]): void => {
    trackCalls.push(args);
  };
  let receivedTrackRef: unknown;
  const env: ApiEnv = { api: { track: originalTrack } };

  const code: Destination.Instance<ApiTypes> = {
    type: 'api',
    config: {},
    env,
    ...(opts.declareCalls ? { calls: ['call:api.track'] } : {}),
    push: async (event, context) => {
      receivedTrackRef = context.env.api.track;
      const args = opts.pushArgs ? opts.pushArgs(event) : ['hit', event.name];
      context.env.api.track(...args);
      if (opts.throwAfterTrack) throw new Error('delivery failed');
    },
  };

  const { collector } = await startFlow({
    run: true,
    destinations: { api: { code } },
  });

  if (opts.observeLevel) {
    const level = opts.observeLevel;
    collector.observeLevel = () => level;
  }

  collector.observers.add((state) => states.push(state));

  return {
    collector,
    states,
    trackCalls,
    originalTrack,
    getReceivedTrackRef: () => receivedTrackRef,
  };
}

function outRecords(states: FlowState[]): FlowState[] {
  return states.filter(
    (s) => s.stepId === 'destination.api' && s.phase === 'out',
  );
}

describe('destination trace-level vendor-call capture', () => {
  test('trace level + declared calls records the call on the out record and still invokes the real fn', async () => {
    const {
      collector,
      states,
      trackCalls,
      originalTrack,
      getReceivedTrackRef,
    } = await buildApiFlow({ declareCalls: true, observeLevel: 'trace' });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = outRecords(states)[0];
    expect(out?.calls).toBeDefined();
    expect(out?.calls).toHaveLength(1);
    expect(out?.calls?.[0]?.fn).toBe('api.track');
    expect(out?.calls?.[0]?.args).toEqual(['hit', 'page view']);
    expect(typeof out?.calls?.[0]?.ts).toBe('number');

    // The real env fn was still invoked through the recording wrapper.
    expect(trackCalls).toEqual([['hit', 'page view']]);
    // The push saw the wrapper, not the original fn (env was cloned+wrapped).
    expect(getReceivedTrackRef()).not.toBe(originalTrack);

    // Calls attach to the out record ONLY: the in record never carries them.
    const inRecord = states.find(
      (s) => s.stepId === 'destination.api' && s.phase === 'in',
    );
    expect(inRecord).toBeDefined();
    expect(inRecord?.calls).toBeUndefined();
  });

  test('no observeLevel supplier leaves the env untouched and adds no calls', async () => {
    const {
      collector,
      states,
      trackCalls,
      originalTrack,
      getReceivedTrackRef,
    } = await buildApiFlow({ declareCalls: true });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = outRecords(states)[0];
    expect(out).toBeDefined();
    expect(out?.calls).toBeUndefined();
    // The original fn identity was called: no clone happened.
    expect(getReceivedTrackRef()).toBe(originalTrack);
    expect(trackCalls).toEqual([['hit', 'page view']]);
  });

  test("observeLevel 'standard' behaves like absent: no capture, no clone", async () => {
    const { collector, states, originalTrack, getReceivedTrackRef } =
      await buildApiFlow({ declareCalls: true, observeLevel: 'standard' });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = outRecords(states)[0];
    expect(out?.calls).toBeUndefined();
    expect(getReceivedTrackRef()).toBe(originalTrack);
  });

  test('trace level but no declared calls runs the unchanged path (no clone, no calls)', async () => {
    const { collector, states, originalTrack, getReceivedTrackRef } =
      await buildApiFlow({ declareCalls: false, observeLevel: 'trace' });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = outRecords(states)[0];
    expect(out?.calls).toBeUndefined();
    expect(getReceivedTrackRef()).toBe(originalTrack);
  });

  test('recorded args are sanitized to a JSON-safe projection', async () => {
    const fnArg = (): number => 42;
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic.self = cyclic;
    class FakeNode {
      tagName = 'DIV';
      toString(): string {
        return '[object HTMLDivElement]';
      }
    }
    const deep = {
      a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } },
    };

    const { collector, states } = await buildApiFlow({
      declareCalls: true,
      observeLevel: 'trace',
      pushArgs: () => [fnArg, cyclic, new FakeNode(), deep],
    });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = outRecords(states)[0];
    const args = out?.calls?.[0]?.args;
    expect(args?.[0]).toBe('[function]');
    expect(args?.[1]).toEqual({ name: 'root', self: '[circular]' });
    expect(args?.[2]).toBe('[object HTMLDivElement]');
    // Depth cap replaces the leaf below the limit with a marker.
    expect(args?.[3]).toEqual({
      a: { b: { c: { d: { e: { f: '[truncated]' } } } } },
    });
    // The whole recorded array must survive JSON serialization.
    expect(() => JSON.stringify(out?.calls)).not.toThrow();
  });

  test('a throwing getter on a recorded arg never fails the push', async () => {
    const hostile: Record<string, unknown> = { ok: 1 };
    Object.defineProperty(hostile, 'boom', {
      enumerable: true,
      get() {
        throw new Error('hostile getter');
      },
    });

    const { collector, states, trackCalls } = await buildApiFlow({
      declareCalls: true,
      observeLevel: 'trace',
      pushArgs: () => [hostile],
    });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    // Delivery succeeded: the real fn ran and no error record was emitted.
    expect(trackCalls).toHaveLength(1);
    const errors = states.filter(
      (s) => s.stepId === 'destination.api' && s.phase === 'error',
    );
    expect(errors).toHaveLength(0);

    // The offending value degrades to a marker; the rest survives.
    const out = outRecords(states)[0];
    expect(out).toBeDefined();
    expect(out?.calls?.[0]?.args).toEqual([{ ok: 1, boom: '[unreadable]' }]);
    expect(() => JSON.stringify(out?.calls)).not.toThrow();
  });

  test('an error record carries the calls made before the failure', async () => {
    const { collector, states, trackCalls } = await buildApiFlow({
      declareCalls: true,
      observeLevel: 'trace',
      throwAfterTrack: true,
    });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    // The vendor call happened before the failure, so capture recorded it...
    expect(trackCalls).toHaveLength(1);
    // ...and the error record surfaces it, sanitized and JSON-safe, so the
    // pre-failure vendor calls aren't lost. No out record exists on failure.
    const errRecord = states.find(
      (s) => s.stepId === 'destination.api' && s.phase === 'error',
    );
    expect(errRecord).toBeDefined();
    expect(errRecord?.calls).toHaveLength(1);
    expect(errRecord?.calls?.[0]?.fn).toBe('api.track');
    expect(errRecord?.calls?.[0]?.args).toEqual(['hit', 'page view']);
    expect(() => JSON.stringify(errRecord?.calls)).not.toThrow();
    expect(outRecords(states)).toHaveLength(0);
  });

  test('recorded calls are isolated per push', async () => {
    const { collector, states } = await buildApiFlow({
      declareCalls: true,
      observeLevel: 'trace',
    });

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );
    await collector.push(
      { name: 'order complete', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const outs = outRecords(states);
    expect(outs).toHaveLength(2);
    expect(outs[0]?.calls).toHaveLength(1);
    expect(outs[0]?.calls?.[0]?.args).toEqual(['hit', 'page view']);
    expect(outs[1]?.calls).toHaveLength(1);
    expect(outs[1]?.calls?.[0]?.args).toEqual(['hit', 'order complete']);
  });
});

/**
 * Env for the observe-recorder scenarios: the untyped BaseEnv index signature
 * mirrors what a live-web destination sees (an extra `OBSERVE_ENV_KEY` slot the
 * destination never declares), so every access is narrowed via runtime guards.
 */
type ObserveEnv = Destination.BaseEnv;
type ObserveTypes = Destination.Types<unknown, unknown, ObserveEnv>;

/**
 * Run a flow with one destination code instance and capture its FlowStates.
 * `observeLevel` optionally installs the supplier; the destination is always
 * registered under id `obs` so records land on `destination.obs`.
 */
async function runObserveFlow(
  code: Destination.Instance<ObserveTypes>,
  observeLevel?: ObserveLevel,
): Promise<{
  collector: Awaited<ReturnType<typeof startFlow>>['collector'];
  states: FlowState[];
}> {
  const states: FlowState[] = [];
  const { collector } = await startFlow({
    run: true,
    destinations: { obs: { code } },
  });
  if (observeLevel) {
    const level = observeLevel;
    collector.observeLevel = () => level;
  }
  collector.observers.add((state) => states.push(state));
  return { collector, states };
}

function obsOutRecords(states: FlowState[]): FlowState[] {
  return states.filter(
    (s) => s.stepId === 'destination.obs' && s.phase === 'out',
  );
}

describe('destination observe-recorder fallback for unresolved calls', () => {
  test('trace + an unresolvable declared path attaches the recorder; record() lands sanitized on the out record', async () => {
    let sawObserve = false;
    let observedPaths: string[] | undefined;

    const code: Destination.Instance<ObserveTypes> = {
      type: 'obs',
      config: {},
      env: {}, // no `window` → `window.gtag` cannot resolve at wrap time
      calls: ['call:window.gtag'],
      push: async (_event, context) => {
        const observe = context.env[OBSERVE_ENV_KEY];
        if (isEnvObserve(observe)) {
          sawObserve = true;
          observedPaths = observe.paths;
          observe.record('window.gtag', ['event', 'purchase', { value: 42 }]);
        }
      },
    };

    const { collector, states } = await runObserveFlow(code, 'trace');
    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    expect(sawObserve).toBe(true);
    expect(observedPaths).toEqual(['window.gtag']);

    const out = obsOutRecords(states)[0];
    expect(out?.calls).toHaveLength(1);
    expect(out?.calls?.[0]?.fn).toBe('window.gtag');
    expect(out?.calls?.[0]?.args).toEqual(['event', 'purchase', { value: 42 }]);
    expect(typeof out?.calls?.[0]?.ts).toBe('number');
    expect(() => JSON.stringify(out?.calls)).not.toThrow();
  });

  test('malformed declared paths never reach observe.paths', async () => {
    let observedPaths: string[] | undefined;

    const code: Destination.Instance<ObserveTypes> = {
      type: 'obs',
      config: {},
      env: {}, // `window.gtag` well-formed but unresolvable; 'a..b' malformed
      calls: ['a..b', 'call:window.gtag'],
      push: async (_event, context) => {
        const observe = context.env[OBSERVE_ENV_KEY];
        if (isEnvObserve(observe)) observedPaths = observe.paths;
      },
    };

    const { collector } = await runObserveFlow(code, 'trace');
    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    expect(observedPaths).toEqual(['window.gtag']);
  });

  test('recorder calls sit alongside wrapped calls in the same out record', async () => {
    const code: Destination.Instance<ObserveTypes> = {
      type: 'obs',
      config: {},
      env: { api: { track: (..._args: unknown[]) => {} } },
      calls: ['call:api.track', 'call:window.gtag'],
      push: async (_event, context) => {
        const api = context.env.api;
        if (isObject(api) && typeof api.track === 'function')
          api.track('wrapped');
        const observe = context.env[OBSERVE_ENV_KEY];
        if (isEnvObserve(observe)) observe.record('window.gtag', ['recorded']);
      },
    };

    const { collector, states } = await runObserveFlow(code, 'trace');
    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    const out = obsOutRecords(states)[0];
    expect(out?.calls).toHaveLength(2);
    expect(out?.calls?.map((c) => c.fn)).toEqual(['api.track', 'window.gtag']);
    expect(out?.calls?.[1]?.args).toEqual(['recorded']);
  });

  test('non-trace push attaches no observe key even with an unresolvable path', async () => {
    let observeKeyPresent = true;

    const code: Destination.Instance<ObserveTypes> = {
      type: 'obs',
      config: {},
      env: {},
      calls: ['call:window.gtag'],
      push: async (_event, context) => {
        observeKeyPresent = OBSERVE_ENV_KEY in context.env;
      },
    };

    const { collector, states } = await runObserveFlow(code); // no supplier
    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    expect(observeKeyPresent).toBe(false);
    expect(obsOutRecords(states)[0]?.calls).toBeUndefined();
  });

  test('trace + a fully-resolved env attaches no observe key (Phase A path unchanged)', async () => {
    let observeKeyPresent = true;

    const code: Destination.Instance<ObserveTypes> = {
      type: 'obs',
      config: {},
      env: { api: { track: (..._args: unknown[]) => {} } },
      calls: ['call:api.track'],
      push: async (_event, context) => {
        observeKeyPresent = OBSERVE_ENV_KEY in context.env;
        const api = context.env.api;
        if (isObject(api) && typeof api.track === 'function') api.track('hit');
      },
    };

    const { collector, states } = await runObserveFlow(code, 'trace');
    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web') },
    );

    // Everything resolved → unresolved empty → no recorder installed...
    expect(observeKeyPresent).toBe(false);
    // ...and the wrapped call is still recorded byte-identically.
    const out = obsOutRecords(states)[0];
    expect(out?.calls).toHaveLength(1);
    expect(out?.calls?.[0]?.fn).toBe('api.track');
  });
});
