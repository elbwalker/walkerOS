import type { Custom, Destination } from './types';
import type { DestinationCoreEtag } from '@elbwalker/destination-core-etag';
import { getParameters } from '@elbwalker/destination-core-etag';
import { requestToParameter } from '@elbwalker/utils';
import { sendWebAsFetch } from '@elbwalker/utils/web';

// Types
export * as DestinationWebEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config = {}, instance) {
    if (!config.custom || !config.custom.measurementId || !instance?.session)
      return false;
  },

  push(event, config) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;

    const userAgent = navigator.userAgent;
    const context: DestinationCoreEtag.Context = {
      userAgent,
      pageTitle: document.title,
      language: navigator.language,
    };

    const parameters = getParameters([event], custom, context);

    parameters.forEach((parameter) => {
      sendRequest(custom, requestToParameter(parameter.path), parameter.body);
    });

    config.custom = custom;
  },
};

function sendRequest(custom: Custom, path: string, body?: string) {
  const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

  sendWebAsFetch(url + path, body, {
    headers: custom.headers || {},
    method: 'POST',
    noCors: true,
    credentials: 'include', // @TODO be careful with this
  });
}

export default destinationEtag;
