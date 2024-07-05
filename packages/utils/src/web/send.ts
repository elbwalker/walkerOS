import { WalkerOS } from '@elbwalker/types';
import { assign, isSameType } from '../web';

export type DataValue = WalkerOS.Property | WalkerOS.Properties;
export type Headers = { [key: string]: string };
export type Transport = 'fetch' | 'beacon' | 'xhr';

export interface SendOptions {
  headers?: Headers;
  transport?: Transport;
  method?: string;
}

type SendOptionsFetch = SendOptions & { transport?: 'fetch' };
type SendOptionsXhr = SendOptions & { transport?: 'xhr' };

// Define return types for each transport mode
type SendRequestReturnType<T extends Transport> = T extends 'beacon'
  ? boolean
  : T extends 'xhr'
  ? XMLHttpRequest
  : Promise<Response>;

// Generic function type
type SendRequest<T extends Transport = 'fetch'> = (
  url: string,
  data: DataValue,
  options?: SendOptions & { transport?: T },
) => SendRequestReturnType<T>;

// Data transformation function
const transformData = (data: DataValue): string => {
  return isSameType(data, '') ? (data as string) : JSON.stringify(data);
};

export const sendAsFetch: SendRequest<'fetch'> = async (
  url,
  data,
  options = {},
) => {
  const headers = assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    options.headers,
  );

  const body = transformData(data);
  return fetch(url, {
    method: options.method || 'POST',
    headers,
    keepalive: true,
    body,
  });
};

export const sendAsBeacon: SendRequest<'beacon'> = (url, data) => {
  const body = transformData(data);
  return navigator.sendBeacon(url, body);
};

export const sendAsXhr: SendRequest<'xhr'> = (url, data, options = {}) => {
  const headers = assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    options.headers,
  );

  const method = options.method || 'POST';
  const body = transformData(data);

  const xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  for (const header in headers) {
    xhr.setRequestHeader(header, headers[header]);
  }
  xhr.send(body);
  return xhr;
};

export const sendRequest: SendRequest<Transport> = (
  url,
  data,
  options = {},
) => {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendAsBeacon(url, data);
    case 'xhr':
      return sendAsXhr(url, data, options as SendOptionsXhr);
    case 'fetch':
    default:
      return sendAsFetch(url, data, options as SendOptionsFetch);
  }
};
