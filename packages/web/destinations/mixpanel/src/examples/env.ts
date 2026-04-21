import type { Env, MixpanelGroup } from '../types';

const noop = () => {};

/**
 * A recording group handle that accumulates calls so tests can assert on them.
 * Each method records its arguments and returns `this` for chaining.
 */
class RecordingGroup implements MixpanelGroup {
  _calls: Array<{ method: string; args: unknown[] }> = [];

  private _record(method: string, ...args: unknown[]) {
    this._calls.push({ method, args });
  }

  set(...args: unknown[]) {
    this._record('set', ...args);
  }
  set_once(...args: unknown[]) {
    this._record('set_once', ...args);
  }
  unset(...args: unknown[]) {
    this._record('unset', ...args);
  }
  union(...args: unknown[]) {
    this._record('union', ...args);
  }
  remove(...args: unknown[]) {
    this._record('remove', ...args);
  }
  delete(...args: unknown[]) {
    this._record('delete', ...args);
  }
}

/**
 * A no-op group handle returned by the stub get_group(). Tests replace the
 * get_group function in the spy runner so this stub is never actually seen.
 */
const noopGroup: MixpanelGroup = {
  set: noop,
  set_once: noop,
  unset: noop,
  union: noop,
  remove: noop,
  delete: noop,
};

/**
 * Pre-init env — all methods are no-ops until the test runner wires spies.
 */
export const init: Env | undefined = {
  mixpanel: {
    init: noop,
    track: noop,
    identify: noop,
    reset: noop,
    set_group: noop,
    get_group: () => noopGroup,
    opt_in_tracking: noop,
    opt_out_tracking: noop,
    stop_batch_senders: noop,
    people: {
      set: noop,
      set_once: noop,
      increment: noop,
      append: noop,
      union: noop,
      remove: noop,
      unset: noop,
      delete_user: noop,
    },
  },
};

/**
 * Post-init env — same shape. The test runner clones this and replaces
 * individual methods with jest.fn() so it can assert on calls.
 */
export const push: Env = {
  mixpanel: {
    init: noop,
    track: noop,
    identify: noop,
    reset: noop,
    set_group: noop,
    get_group: () => noopGroup,
    opt_in_tracking: noop,
    opt_out_tracking: noop,
    stop_batch_senders: noop,
    people: {
      set: noop,
      set_once: noop,
      increment: noop,
      append: noop,
      union: noop,
      remove: noop,
      unset: noop,
      delete_user: noop,
    },
  },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:mixpanel.init',
  'call:mixpanel.track',
  'call:mixpanel.identify',
  'call:mixpanel.reset',
  'call:mixpanel.set_group',
  'call:mixpanel.get_group',
  'call:mixpanel.opt_in_tracking',
  'call:mixpanel.opt_out_tracking',
  'call:mixpanel.people.set',
  'call:mixpanel.people.set_once',
  'call:mixpanel.people.increment',
  'call:mixpanel.people.append',
  'call:mixpanel.people.union',
  'call:mixpanel.people.remove',
  'call:mixpanel.people.unset',
  'call:mixpanel.people.delete_user',
];
