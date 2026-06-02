import type { Config, Destination, Env } from './types';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationPlausible from './types';

export const destinationPlausible: Destination = {
  type: 'plausible',

  config: {},

  init({ config, env }) {
    const { window } = getEnv<Env>(env);
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings.domain, env);

    window.plausible =
      window.plausible ||
      function () {
        (window.plausible!.q = window.plausible!.q || []).push(arguments);
      };

    return config;
  },

  push(event, { config, data, env }) {
    const params = isObject(data) ? data : {};

    const { window } = getEnv<Env>(env);
    window.plausible!(`${event.name}`, params);
  },
};

function addScript(
  domain?: string,
  env?: Env,
  src = 'https://plausible.io/js/script.manual.js',
) {
  const { document } = getEnv<Env>(env);
  const script = document.createElement('script');
  script.src = src;
  if (domain) script.dataset.domain = domain;
  document.head.appendChild(script);
}

export default destinationPlausible;
