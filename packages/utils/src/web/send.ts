import { WalkerOS } from '@elbwalker/types';
import { isSameType } from '../web';

export interface sendOptions {
  transport?: Transport;
}

export type Transport = 'fetch' | 'beacon' | 'xhr';

export async function sendAsFetch(
  url: string,
  data: XMLHttpRequestBodyInit,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true, // Sending data even after the tab is closed
    body: data,
  });
}

export function sendAsBeacon(
  url: string,
  data: XMLHttpRequestBodyInit,
): boolean {
  return navigator.sendBeacon(url, data);
}

export function sendAsXhr(
  url: string,
  data: XMLHttpRequestBodyInit,
): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  xhr.send(data);
  return xhr;
}

export function sendRequest(
  url: string,
  data: WalkerOS.Property | WalkerOS.Properties,
  options: sendOptions = {},
): void {
  const { transport = 'fetch' } = options;

  // Transform data to string
  if (!isSameType(data, '')) data = JSON.stringify(data);

  switch (transport) {
    case 'beacon':
      sendAsBeacon(url, data);
      break;
    case 'xhr':
      sendAsXhr(url, data);
      break;
    case 'fetch':
    default:
      sendAsFetch(url, data);
      break;
  }
}
