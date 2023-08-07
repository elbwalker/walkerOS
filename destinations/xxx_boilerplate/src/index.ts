import { DestinationXXX } from './types';
export * from './types/index.d';

export const destinationXXX: DestinationXXX.Function = {
  type: 'xxx',

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

export default destinationXXX;
