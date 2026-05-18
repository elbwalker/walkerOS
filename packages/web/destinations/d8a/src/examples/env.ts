import type { D8aFn, InstallD8aOptions, InstallD8aResult } from '@d8a-tech/wt';
import type { Env } from '../types';

function createD8a(): D8aFn {
  const d8a = (() => {}) as D8aFn;
  d8a.js = () => {};
  d8a.config = () => {};
  d8a.event = () => {};
  d8a.set = () => {};
  d8a.consent = () => {};
  return d8a;
}

const installD8a = (opts?: InstallD8aOptions): InstallD8aResult => {
  const windowRef = opts?.windowRef as Env['window'] | undefined;
  const globalName = opts?.globalName || 'd8a';
  const dataLayerName = opts?.dataLayerName || 'd8aLayer';

  if (windowRef) {
    windowRef[dataLayerName] = windowRef[dataLayerName] || [];
    windowRef[globalName] = windowRef[globalName] || createD8a();
  }

  return {
    dataLayerName,
    globalName,
    consumer: {
      start: () => {},
      stop: () => {},
      getState: () => ({}),
      setOnEvent: () => {},
      setOnConfig: () => {},
    },
    dispatcher: {
      enqueueEvent: () => {},
      flush: async () => ({ sent: 0 }),
      flushNow: async () => ({ sent: 0 }),
      attachLifecycleFlush: () => {},
    },
  };
};

export const init: Env = {
  installD8a,
  window: {},
};

export const push: Env = {
  installD8a,
  window: {
    d8a: createD8a(),
    d8aLayer: [],
  },
};

export const simulation = ['call:window.d8a'];
