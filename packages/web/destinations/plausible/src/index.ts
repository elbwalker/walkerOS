import type { Config, Destination } from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationPlausible from './types';

// Examples
export * as examples from './examples';

// Schemas
export * as schema from './schema';

export const destinationPlausible: Destination = {
  type: 'plausible',

  config: {},

  init({ config, env }) {
    const { window } = getEnv(env);
    const w = window as Window;
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings.domain, env);

    w.plausible =
      w.plausible ||
      function () {
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };

    return config;
  },

  push(event, { config, data, env }) {
    const params = isObject(data) ? data : {};

    const { window } = getEnv(env);
    const plausible = (window as Window).plausible!;
    plausible(`${event.name}`, params);
  },
};

function addScript(
  domain?: string,
  env?: DestinationWeb.Env,
  src = 'https://plausible.io/js/script.manual.js',
) {
  const { document } = getEnv(env);
  const doc = document as Document;
  const script = doc.createElement('script');
  script.src = src;
  if (domain) script.dataset.domain = domain;
  doc.head.appendChild(script);
}

export default destinationPlausible;
