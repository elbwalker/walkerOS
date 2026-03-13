import type { Trigger } from '@walkeros/core';
import type { CloudFunctionSource, Request, Response } from '../types';

export interface Content {
  method: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface Result {
  status: number;
  body: unknown;
}

/**
 * GCP CloudFunction source trigger.
 * Synthesizes mock req/res from step example `in` data, calls source.push(req, res).
 */
export function createTrigger(
  source: CloudFunctionSource,
): Trigger.Fn<Content, Promise<Result>> {
  return async (content) => {
    // Adapt body: step examples use `name`, source expects `event`
    const body = { ...content.body };
    if (body.name && !body.event) {
      body.event = body.name;
      delete body.name;
    }

    const headers = content.headers || { 'content-type': 'application/json' };

    const req = {
      method: content.method,
      body,
      headers,
      get: (h: string) => headers[h.toLowerCase()],
    } as Request;

    let statusCode = 200;
    let responseBody: unknown;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        responseBody = data;
        return res;
      },
      send: (data: unknown) => {
        responseBody = data;
        return res;
      },
      set: () => res,
    } as unknown as Response;

    await source.push(req, res);
    return { status: statusCode, body: responseBody };
  };
}
