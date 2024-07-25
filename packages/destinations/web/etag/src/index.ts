import type { CustomConfig, Destination } from './types';
import { getPageViewEvent, getParams } from '@elbwalker/destination-core-etag';
import { requestToParameter, sendWebAsFetch } from '@elbwalker/utils';

// Types
export * as DestinationWebEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config, instance) {
    if (!config.custom || !config.custom.measurementId || !instance.session)
      return false;
  },

  push(event, config, mapping, instance) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;
    const session = instance?.session;

    const userAgent = navigator.userAgent;
    const context = {
      session,
      userAgent,
      pageTitle: document.title,
      language: navigator.language,
    };

    // page_view
    if (!custom.sentPageView) {
      const pageViewEvent = getPageViewEvent(event);

      const requestData = getParams(pageViewEvent, custom, context);
      sendRequest(
        custom,
        requestToParameter(requestData.path),
        requestData.body,
      );

      custom.sentPageView = true;
    }

    const requestData = getParams(event, custom, context);

    sendRequest(custom, requestToParameter(requestData.path), requestData.body);

    config.custom = custom;
  },
};

function sendRequest(custom: CustomConfig, path: string, body?: string) {
  const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

  sendWebAsFetch(url + path, body, {
    headers: custom.headers || {},
    method: 'POST',
    noCors: true,
    credentials: 'include', // @TODO be careful with this
  });
}

export default destinationEtag;
