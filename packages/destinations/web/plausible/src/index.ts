import type { Config, Destination } from './types';
import { isObject } from '@elbwalker/utils';

// Types
export * as DestinationPlausible from './types';

export const destinationPlausible: Destination = {
  type: 'plausible',

  config: {},

  init(config: Config) {
    const w = window;
    const custom = config.custom || {};

    if (config.loadScript) addScript(custom.domain);

    w.plausible =
      w.plausible ||
      function () {
        // eslint-disable-next-line prefer-rest-params
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };
  },

  push(event, config, mapping, options = {}) {
    const { fn } = config;
    const props = isObject(options.data) ? options.data : event.data;

    const func = fn || window.plausible!;
    func(`${event.event}`, { props });
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
