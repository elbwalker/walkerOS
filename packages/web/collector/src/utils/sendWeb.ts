import type { SendDataValue, SendHeaders, SendResponse } from '@walkerOS/core';
import {
  getHeaders,
  transformData,
  tryCatch,
  tryCatchAsync,
} from '@walkerOS/core';

export type SendWebTransport = 'fetch' | 'beacon' | 'xhr';

export interface SendWebOptions {
  headers?: SendHeaders;
  transport?: SendWebTransport;
  method?: string;
}

export interface SendWebOptionsFetch extends SendWebOptions {
  credentials?: 'omit' | 'same-origin' | 'include'; // Add credentials option
  noCors?: boolean; // Add noCors option for fetch transport
}

type SendWebOptionsDynamic<T extends SendWebTransport> = T extends 'fetch'
  ? SendWebOptionsFetch
  : SendWebOptions;

export type SendWebReturn<T extends SendWebTransport> = T extends 'fetch'
  ? Promise<SendResponse>
  : SendResponse;

export function sendWeb<T extends SendWebTransport>(
  url: string,
  data?: SendDataValue,
  options: SendWebOptionsDynamic<T> & { transport?: T } = {
    transport: 'fetch' as T,
  },
): SendWebReturn<T> {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendWebAsBeacon(url, data) as SendWebReturn<T>;
    case 'xhr':
      return sendWebAsXhr(url, data, options) as SendWebReturn<T>;
    case 'fetch':
    default:
      return sendWebAsFetch(url, data, options) as SendWebReturn<T>;
  }
}

export async function sendWebAsFetch(
  url: string,
  data?: SendDataValue,
  options: SendWebOptionsFetch = {},
): Promise<SendResponse> {
  const headers = getHeaders(options.headers);
  const body = transformData(data);

  return tryCatchAsync(
    async () => {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers,
        keepalive: true,
        credentials: options.credentials || 'same-origin',
        mode: options.noCors ? 'no-cors' : 'cors',
        body,
      });

      const responseData = options.noCors ? '' : await response.text();

      return {
        ok: response.ok,
        data: responseData,
        error: response.ok ? undefined : response.statusText,
      };
    },
    (error) => {
      return {
        ok: false,
        error: (error as Error).message,
      };
    },
  )();
}

export function sendWebAsBeacon(
  url: string,
  data?: SendDataValue,
): SendResponse {
  const body = transformData(data);
  const ok = navigator.sendBeacon(url, body);

  return {
    ok,
    error: ok ? undefined : 'Failed to send beacon',
  };
}

export function sendWebAsXhr(
  url: string,
  data?: SendDataValue,
  options: SendWebOptions = {},
): SendResponse {
  const headers = getHeaders(options.headers);
  const method = options.method || 'POST';
  const body = transformData(data);

  return tryCatch(
    () => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, false); // Synchronous request
      for (const header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }
      xhr.send(body);

      const ok = xhr.status >= 200 && xhr.status < 300;

      const parsedData = tryCatch(JSON.parse, () => xhr.response)(xhr.response);

      return {
        ok,
        data: parsedData,
        error: ok ? undefined : `${xhr.status} ${xhr.statusText}`,
      };
    },
    (error) => {
      return {
        ok: false,
        error: (error as Error).message,
      };
    },
  )();
}
