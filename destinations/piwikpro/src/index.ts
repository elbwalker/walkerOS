import { DestinationPiwikPro } from './types';
export * from './types/index.d';

export const destinationPiwikPro: DestinationPiwikPro.Function = {
  config: {},

  init(config) {
    // if (config.loadScript) addScript();

    // Do something initializing

    return true;
  },

  push(event, config, mapping = {}) {
    // Do something magical
  },
};

function addScript(src: string) {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);
}

export default destinationPiwikPro;
