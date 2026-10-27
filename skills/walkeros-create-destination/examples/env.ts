import { mockScriptDocument } from '@walkeros/web-core/dev';
import type { Env } from '../types';

const noop = () => {};

/** Before init: no SDK global yet, `init` installs the stub. */
export const init: Env = {
  window: {},
  document: mockScriptDocument(),
};

/** After init: the SDK global the push calls. */
export const push: Env = {
  window: { vendorSdk: Object.assign(noop, { q: [] as IArguments[] }) },
  document: mockScriptDocument(),
};

/** The calls a simulation records. */
export const simulation = ['call:window.vendorSdk'];
