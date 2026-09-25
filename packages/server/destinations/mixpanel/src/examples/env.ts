import type {
  Env,
  MixpanelClient,
  MixpanelPeople,
  MixpanelGroups,
} from '../types';

/**
 * The SDK reports completion through an optional trailing callback, which the
 * destination awaits; call it so a simulated push completes.
 */
const noop = (...args: unknown[]): void => {
  const callback = args[args.length - 1];
  if (typeof callback === 'function') callback();
};

const noopPeople: MixpanelPeople = {
  set: noop,
  set_once: noop,
  increment: noop,
  append: noop,
  union: noop,
  remove: noop,
  unset: noop,
  delete_user: noop,
};

const noopGroups: MixpanelGroups = {
  set: noop,
  set_once: noop,
  union: noop,
  remove: noop,
  unset: noop,
  delete_group: noop,
};

/**
 * Mock Mixpanel factory that returns a no-op client instance.
 * Tests replace individual methods with spies.
 */
function mockInit(): MixpanelClient {
  return {
    track: noop,
    import: noop,
    alias: noop,
    people: { ...noopPeople },
    groups: { ...noopGroups },
  };
}

/**
 * Standard mock environment for push operations.
 * The test runner clones this and replaces methods with spies.
 */
export const push: Env = {
  Mixpanel: { init: mockInit },
};

/**
 * Simulation tracking paths for CLI --simulate. `init` carries the token and is
 * not recorded; the paths walk through its result to the request calls.
 */
export const simulation = [
  'call:Mixpanel.init.track',
  'call:Mixpanel.init.import',
  'call:Mixpanel.init.alias',
  'call:Mixpanel.init.people.set',
  'call:Mixpanel.init.people.set_once',
  'call:Mixpanel.init.people.increment',
  'call:Mixpanel.init.people.append',
  'call:Mixpanel.init.people.union',
  'call:Mixpanel.init.people.remove',
  'call:Mixpanel.init.people.unset',
  'call:Mixpanel.init.people.delete_user',
  'call:Mixpanel.init.groups.set',
  'call:Mixpanel.init.groups.set_once',
  'call:Mixpanel.init.groups.union',
  'call:Mixpanel.init.groups.remove',
  'call:Mixpanel.init.groups.unset',
  'call:Mixpanel.init.groups.delete_group',
];
