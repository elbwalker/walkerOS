import { getId, tryCatch } from '@elbwalker/utils';
import type { CustomConfig, Destination, Parameters } from './types';
import { WalkerOS } from '@elbwalker/types';

// Types
export * as DestinationEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config) {
    if (!config.custom || !config.custom.measurementId) return false;
  },

  push(event, config) {
    const { custom } = config;
    if (!custom) return;

    const url = custom.url || 'https://www.google-analytics.com/g/collect';

    const params: Parameters = {
      v: '2', // Protocol version, always 2 for GA4
      tid: custom.measurementId, // TrackingID/MeasurementID
      gcs: 'G111', // Consent mode, granted
      gcd: '11t1t1t1t5', // Consent mode v2, granted by default
      _p: getId(), // Cache buster
      cid: getClientId(event, custom), // Client ID
    };

    tryCatch(sendRequest, (e) => console.error(e))(url, {
      ...params,
      ...custom.params,
    });
  },
};

function getClientId(event: WalkerOS.Event, custom: CustomConfig) {
  return custom.clientId || event.user.device || '';
}

function sendRequest(url: string, params: Parameters) {
  // Construct query string from params object
  const data = new URLSearchParams(params).toString();

  // Serialize data
  const payload = new Blob([data], { type: 'text/plain' });

  // Fire and forget
  navigator.sendBeacon(url, payload);
}

export default destinationEtag;
