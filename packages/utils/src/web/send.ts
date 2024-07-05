import { WalkerOS } from '@elbwalker/types';
import { assign, isSameType, tryCatch, tryCatchAsync } from '../web';

export type DataValue = WalkerOS.Property | WalkerOS.Properties;
export type Headers = { [key: string]: string };
export type Transport = 'fetch' | 'beacon' | 'xhr';

export interface SendOptions {
  headers?: Headers;
  transport?: Transport;
  method?: string;
}

export interface SendResponse {
  ok: boolean;
  response?: unknown;
  error?: string;
}

export type SendRequestReturnType<T extends Transport> = T extends 'fetch'
  ? Promise<SendResponse>
  : SendResponse;

export function sendRequest<T extends Transport>(
  url: string,
  data: DataValue,
  options: SendOptions & { transport: T } = { transport: 'fetch' as T },
): SendRequestReturnType<T> {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendAsBeacon(url, data) as SendRequestReturnType<T>;
    case 'xhr':
      return sendAsXhr(url, data, options) as SendRequestReturnType<T>;
    case 'fetch':
    default:
      return sendAsFetch(url, data, options) as SendRequestReturnType<T>;
  }
}

export async function sendAsFetch(
  url: string,
  data: DataValue,
  options: SendOptions = {},
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
        error: (error as Error).message,
      };
    },
  )();
}

export function sendAsBeacon(url: string, data: DataValue): SendResponse {
  const body = transformData(data);
  const ok = navigator.sendBeacon(url, body);

  return {
    ok,
    error: ok ? undefined : 'Failed to send beacon',
  };
}

export function sendAsXhr(
  url: string,
  data: DataValue,
  options: SendOptions = {},
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
        error: (error as Error).message,
      };
    },
  )();
}

const transformData = (data: DataValue): string => {
  return isSameType(data, '' as string) ? data : JSON.stringify(data);
};

function getHeaders(headers: Headers = {}): Headers {
  return assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    headers,
  );
}
