import type { Trigger } from '@walkeros/core';
import type { FetchSource } from '../types';

export interface Content {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Fetch source trigger.
 * Creates a Request from step example `in` data, calls source.push(request).
 */
export function createTrigger(
  source: FetchSource,
): Trigger.Fn<Content, Promise<Response>> {
  return async (content) => {
    const request = new Request(content.url, {
      method: content.method,
      body: content.body ? JSON.stringify(content.body) : undefined,
      headers: content.body
        ? { 'content-type': 'application/json', ...content.headers }
        : content.headers,
    });

    return source.push(request);
  };
}
