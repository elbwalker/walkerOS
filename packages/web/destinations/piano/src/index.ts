import type { Env, Destination, PianoAnalytics } from './types';
import { isDefined, isObject } from '@walkeros/core';

// Types
export * as DestinationPiano from './types';

const SCRIPT_SRC = 'https://tag.aticdn.net/piano-analytics.js';

export const destinationPiano: Destination = {
  type: 'piano',

  config: {},

  init({ config, env }) {
    const settings = config.settings || {};

    const configure = () => {
      const pa = resolvePa(env);
      if (pa && isDefined(settings.site) && isDefined(settings.collectDomain)) {
        pa.setConfigurations({
          site: settings.site,
          collectDomain: settings.collectDomain,
          ...(isObject(settings.options) ? settings.options : {}),
        });
      }
    };

    // When we inject the SDK it loads asynchronously, so `window.pa` is not
    // available in the same tick. Defer configuration until `onload` fires.
    if (config.loadScript) {
      addScript(SCRIPT_SRC, configure);
    } else {
      configure();
    }

    return config;
  },

  push(event, { data, env }) {
    const pa = resolvePa(env);
    if (!pa) return;

    pa.sendEvent(event.name, isObject(data) ? data : {});
  },
};

/**
 * Resolve the Piano `pa` SDK without casts: prefer the injected env (tests,
 * simulation), fall back to the browser global declared on `Window`.
 */
function resolvePa(env: Env): PianoAnalytics | undefined {
  return (
    env.window?.pa ?? (typeof window !== 'undefined' ? window.pa : undefined)
  );
}

function addScript(src = SCRIPT_SRC, onReady?: () => void) {
  if (typeof document === 'undefined') return;
  const script = document.createElement('script');
  script.src = src;
  if (onReady) script.onload = () => onReady();
  document.head.appendChild(script);
}

export default destinationPiano;
