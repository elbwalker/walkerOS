import type { WalkerOS } from './types';
import { isSameType } from './is';
import { assign } from './assign';

export type SendDataValue = WalkerOS.Property | WalkerOS.Properties;
export type SendHeaders = { [key: string]: string };

export interface SendResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Transforms data to a string.
 *
 * @param data The data to transform.
 * @returns The transformed data.
 */
export function transformData(data?: SendDataValue): string | undefined {
  if (data === undefined) return data;

  return isSameType(data, '' as string) ? data : JSON.stringify(data);
}

/**
 * Gets the headers for a request.
 *
 * @param headers The headers to merge with the default headers.
 * @returns The merged headers.
 */
export function getHeaders(headers: SendHeaders = {}): SendHeaders {
  return assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
    },
    headers,
  );
}
