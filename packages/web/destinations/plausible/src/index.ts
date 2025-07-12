import type { Config, Destination } from './types';
import { isObject } from '@walkerOS/web-collector';

// Types
export * as DestinationPlausible from './types';

// Examples
export * as destinationPlausibleExamples from './examples';

export const destinationPlausible: Destination = {
  type: 'plausible',

  config: {},

  init({ config, wrap }) {
    const w = window;
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings.domain);

    w.plausible =
      w.plausible ||
      function () {
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };
  },

  push(event, { config, data, wrap }) {
    const params = isObject(data) ? data : {};

    const plausible = wrap('plausible', window.plausible!);
    plausible(`${event.event}`, params);
  },
};

function addScript(
  domain?: string,
  src = 'https://plausible.io/js/script.manual.js',
) {
  const script = document.createElement('script');
  script.src = src;
  if (domain) script.dataset.domain = domain;
  document.head.appendChild(script);
}

export default destinationPlausible;
