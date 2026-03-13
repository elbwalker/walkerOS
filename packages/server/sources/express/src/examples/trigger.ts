import type { Trigger } from '@walkeros/core';
import type { ExpressSource } from '../types';
import type { Request, Response } from 'express';

export interface Content {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface Result {
  status: number;
  body: unknown;
}

/**
 * Express source trigger.
 * Synthesizes mock req/res from step example `in` data, calls source.push(req, res).
 */
export function createTrigger(
  source: ExpressSource,
): Trigger.Fn<Content, Promise<Result>> {
  return async (content) => {
    let url = content.path;
    if (content.query) {
      url = `${content.path}?${new URLSearchParams(content.query).toString()}`;
    }

    const defaultHeaders: Record<string, string> = {
      'content-type': 'application/json',
    };
    const headers = { ...defaultHeaders, ...content.headers };

    const req = {
      method: content.method,
      url,
      body: content.body,
      headers,
      get: (h: string) => headers[h.toLowerCase()] || '',
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
      end: () => res,
    } as unknown as Response;

    await source.push(req, res);
    return { status: statusCode, body: responseBody };
  };
}
