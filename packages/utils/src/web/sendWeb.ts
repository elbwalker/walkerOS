import type { SendDataValue, SendHeaders, SendResponse } from '../';
import { getHeaders, transformData, tryCatch, tryCatchAsync } from '../';

export type SendWebTransport = 'fetch' | 'beacon' | 'xhr';

export interface SendWebOptions {
  headers?: SendHeaders;
  transport?: SendWebTransport;
  method?: string;
}

export type SendWebReturn<T extends SendWebTransport> = T extends 'fetch'
  ? Promise<SendResponse>
  : SendResponse;

export function sendRequestWeb<T extends SendWebTransport>(
  url: string,
  data: SendDataValue,
  options: SendWebOptions & { transport: T } = { transport: 'fetch' as T },
): SendWebReturn<T> {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendAsBeacon(url, data) as SendWebReturn<T>;
    case 'xhr':
      return sendAsXhr(url, data, options) as SendWebReturn<T>;
    case 'fetch':
    default:
      return sendAsFetch(url, data, options) as SendWebReturn<T>;
  }
}

const response = undefined;

export async function sendAsFetch(
  url: string,
  data: SendDataValue,
  options: SendWebOptions = {},
): Promise<SendResponse> {
  const headers = getHeaders(options.headers);
  const body = transformData(data);

  return tryCatchAsync(
    async () => {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers,
        keepalive: true,
        body,
      });

      const responseData = await response.json();

      return {
        ok: response.ok,
        response: responseData,
        error: response.ok ? undefined : response.statusText,
      };
    },
    (error) => {
      return {
        ok: false,
        response,
        error: (error as Error).message,
      };
    },
  )();
}

export function sendAsBeacon(url: string, data: SendDataValue): SendResponse {
  const body = transformData(data);
  const ok = navigator.sendBeacon(url, body);

  return {
    ok,
    response,
    error: ok ? undefined : 'Failed to send beacon',
  };
}

export function sendAsXhr(
  url: string,
  data: SendDataValue,
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

      return {
        ok,
        response: xhr.response,
        error: ok ? undefined : xhr.statusText,
      };
    },
    (error) => {
      return {
        ok: false,
        response,
        error: (error as Error).message,
      };
    },
  )();
}
