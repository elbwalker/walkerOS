import type { WalkerOS } from '@elbwalker/types';
import { assign, isSameType } from '../';

export type SendDataValue = WalkerOS.Property | WalkerOS.Properties;
export type SendHeaders = { [key: string]: string };

export interface SendResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export function transformData(data?: SendDataValue): string | undefined {
  if (data === undefined) return data;

  return isSameType(data, '' as string) ? data : JSON.stringify(data);
}

export function getHeaders(headers: SendHeaders = {}): SendHeaders {
  return assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    headers,
  );
}
