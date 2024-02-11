import type { Destination } from './types';

// Types
export * as DestinationWebAPI from './types';

export const destinationWebAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping) {
    const custom = config.custom;
    if (!custom) return;

    const data = custom.transform
      ? custom.transform(event, config, mapping) // Transform event data
      : JSON.stringify(event);

    switch (custom.transport) {
      case 'beacon':
        sendAsBeacon(custom.url, data);
        break;
      case 'xhr':
        sendAsXhr(custom.url, data);
        break;
      case 'fetch':
      default:
        sendAsFetch(custom.url, data);
        break;
    }
  },
};

function sendAsFetch(url: string, data: XMLHttpRequestBodyInit) {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true, // Sending data even after the tab is closed
    body: data,
  });
}

function sendAsBeacon(url: string, data: XMLHttpRequestBodyInit) {
  navigator.sendBeacon(url, data);
}

function sendAsXhr(url: string, data: XMLHttpRequestBodyInit) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
  xhr.send(data);
}

export default destinationWebAPI;
