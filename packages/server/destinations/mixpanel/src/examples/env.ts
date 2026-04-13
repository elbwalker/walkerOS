import type {
  Env,
  MixpanelClient,
  MixpanelPeople,
  MixpanelGroups,
} from '../types';

const noop = (() => {}) as (...args: unknown[]) => void;

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
  Mixpanel: { init: mockInit as (...args: unknown[]) => MixpanelClient },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:Mixpanel.init',
  'call:mp.track',
  'call:mp.import',
  'call:mp.alias',
  'call:mp.people.set',
  'call:mp.people.set_once',
  'call:mp.people.increment',
  'call:mp.people.append',
  'call:mp.people.union',
  'call:mp.people.remove',
  'call:mp.people.unset',
  'call:mp.people.delete_user',
  'call:mp.groups.set',
  'call:mp.groups.set_once',
  'call:mp.groups.union',
  'call:mp.groups.remove',
  'call:mp.groups.unset',
  'call:mp.groups.delete_group',
];
