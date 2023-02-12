import { DestinationXXX } from './types';

declare global {
  interface Window {}
}

export const destination: DestinationXXX.Function = {
  config: {},

  init(config) {
    if (config.loadScript) addScript();

    // Do something initializing

    return true;
  },

  push(event, config, mapping = {}) {
    // Do something magical
  },
};

function addScript(src = 'https://XXX_DOMAIN/xxx.js') {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
}

export default destination;
