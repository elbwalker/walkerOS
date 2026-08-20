import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { normalizeBody } from '@walkeros/core';
import type {
  LambdaEvent,
  ParsedRequest,
  CorsOptions,
  RequestBody,
  EventRequest,
} from './types';

export function isAPIGatewayV2(
  event: LambdaEvent,
): event is APIGatewayProxyEventV2 {
  return 'version' in event && event.version === '2.0';
}

export function parseEvent(event: LambdaEvent): ParsedRequest {
  if (isAPIGatewayV2(event)) {
    const headers: Record<string, string> = {};
    if (event.headers) {
      Object.entries(event.headers).forEach(([key, value]) => {
        if (value) headers[key.toLowerCase()] = value;
      });
    }
    return {
      method: event.requestContext.http.method,
      body: event.body,
      queryString: event.rawQueryString || null,
      headers,
      isBase64Encoded: event.isBase64Encoded || false,
    };
  } else {
    const headers: Record<string, string> = {};
    if (event.headers) {
      Object.entries(event.headers).forEach(([key, value]) => {
        if (value) headers[key.toLowerCase()] = value;
      });
    }
    // v1 carries repeated headers in a second bag. Without it every value but
    // the last is lost, so the multi-value bag wins where a name is in both.
    if (event.multiValueHeaders) {
      Object.entries(event.multiValueHeaders).forEach(([key, values]) => {
        if (values && values.length)
          headers[key.toLowerCase()] = values.join(', ');
      });
    }
    let queryString: string | null = null;
    const params = new URLSearchParams();
    if (event.queryStringParameters) {
      Object.entries(event.queryStringParameters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    // Same for repeated query keys: the single-value bag keeps only the last.
    if (event.multiValueQueryStringParameters) {
      Object.entries(event.multiValueQueryStringParameters).forEach(
        ([key, values]) => {
          if (!values || !values.length) return;
          params.delete(key);
          values.forEach((value) => params.append(key, value));
        },
      );
    }
    queryString = params.toString() || null;
    return {
      method: event.httpMethod,
      body: event.body,
      queryString,
      headers,
      isBase64Encoded: event.isBase64Encoded || false,
    };
  }
}

export function getPath(event: LambdaEvent): string {
  if (isAPIGatewayV2(event)) {
    return event.rawPath;
  } else {
    return event.path;
  }
}

export function parseBody(body: unknown, isBase64Encoded: boolean): unknown {
  return normalizeBody(body, isBase64Encoded);
}

export function isEventRequest(body: unknown): body is EventRequest {
  if (typeof body !== 'object' || body === null) return false;
  if ('name' in body && typeof body.name === 'string') return true;
  return 'event' in body && typeof body.event === 'string';
}

export function getCorsHeaders(
  corsOptions: boolean | CorsOptions,
): Record<string, string> {
  if (!corsOptions) return {};
  if (corsOptions === true) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    };
  }

  const headers: Record<string, string> = {};

  if (corsOptions.origin) {
    const origin = Array.isArray(corsOptions.origin)
      ? corsOptions.origin.join(', ')
      : corsOptions.origin;
    headers['Access-Control-Allow-Origin'] = origin;
  }
  if (corsOptions.methods) {
    headers['Access-Control-Allow-Methods'] = corsOptions.methods.join(', ');
  }
  if (corsOptions.headers) {
    headers['Access-Control-Allow-Headers'] = corsOptions.headers.join(', ');
  }
  if (corsOptions.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  if (corsOptions.maxAge !== undefined) {
    headers['Access-Control-Max-Age'] = corsOptions.maxAge.toString();
  }

  return headers;
}

export function createResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
  requestId?: string,
): APIGatewayProxyResult {
  const responseHeaders: Record<string, string> = {
    'Content-Type':
      typeof body === 'object' ? 'application/json' : 'text/plain',
    ...headers,
  };

  if (requestId) {
    responseHeaders['X-Request-ID'] = requestId;
  }

  return {
    statusCode,
    headers: responseHeaders,
    body: typeof body === 'object' ? JSON.stringify(body) : String(body),
    isBase64Encoded: false,
  };
}

export function createPixelResponse(
  headers: Record<string, string> = {},
  requestId?: string,
): APIGatewayProxyResult {
  const responseHeaders: Record<string, string> = {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...headers,
  };

  if (requestId) {
    responseHeaders['X-Request-ID'] = requestId;
  }

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    isBase64Encoded: true,
  };
}
