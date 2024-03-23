import { getId } from '@elbwalker/utils';
import type { CustomConfig, Destination, Parameters } from './types';
import { WalkerOS } from '@elbwalker/types';

// Types
export * as DestinationEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config) {
    const { custom } = config;
    if (!custom) return;

    // required measurement id
    if (!custom.measurementId) return;

    if (!custom.url) custom.url = 'https://www.google-analytics.com/g/collect';

    this.config.custom = custom;
  },

  push(event, config) {
    const { custom } = config;
    if (!custom) return;

    const params: Parameters = {
      v: '2', // Protocol version, always 2 for GA4
      tid: custom.measurementId, // TrackingID/MeasurementID
      gcs: 'G111', // Consent mode, granted
      gcd: '11t1t1t1t5', // Consent mode v2, granted by default
      _p: getId(), // Cache buster
      cid: getClientId(event, custom), // Client ID
    };

    sendRequest(custom.url, params);
  },
};

function getClientId(event: WalkerOS.Event, custom: CustomConfig) {
  return event.user.device || custom.clientId || '';
}

function sendRequest(url: string, params: Parameters) {
  // Construct query string from params object
  const queryString = new URLSearchParams(params).toString();

  // Complete URL with query string
  const fullUrl = `${url}?${queryString}`;

  // Use the Fetch API to send the request
  fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
  })
    .then((response) => {
      if (!response.ok) console.error('failed:', response.statusText);

      return response.json();
    })
    .then((text) => {
      console.log('success:', text);
    })
    .catch((error) => {
      console.error('error:', error);
    });
}

export default destinationEtag;
