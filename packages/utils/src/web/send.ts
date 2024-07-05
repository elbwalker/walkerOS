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

// Standardized response type
export interface SendResponse {
  ok: boolean;
  response?: unknown;
  error?: string;
}

// Data transformation function
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

export const sendAsFetch = async (
  url: string,
  data: DataValue,
  options: SendOptions = {},
): Promise<SendResponse> => {
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
};

export const sendAsBeacon = (url: string, data: DataValue): SendResponse => {
  const body = transformData(data);
  const ok = navigator.sendBeacon(url, body);

  return {
    ok,
    error: ok ? undefined : 'Failed to send beacon',
  };
};

export const sendAsXhr = (
  url: string,
  data: DataValue,
  options: SendOptions = {},
): SendResponse => {
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
};

// Updated sendRequest function
export const sendRequest = (
  url: string,
  data: DataValue,
  options: SendOptions = { transport: 'fetch' },
): Promise<SendResponse> | SendResponse => {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendAsBeacon(url, data);
    case 'xhr':
      return sendAsXhr(url, data, options);
    case 'fetch':
    default:
      return sendAsFetch(url, data, options);
  }
};
