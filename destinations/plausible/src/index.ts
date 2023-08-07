import { DestinationPlausible } from './types';

export const destinationPlausible: DestinationPlausible.Function = {
  type: 'plausible',

  config: {},

  init(config: DestinationPlausible.Config) {
    const w = window;
    const custom = config.custom || {};

    if (config.loadScript) addScript(custom.domain);

    w.plausible =
      w.plausible ||
      function () {
        (w.plausible!.q = w.plausible!.q || []).push(arguments);
      };

    return true;
  },

  push(event) {
    window.plausible(`${event.event}`, { props: event.data });
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
