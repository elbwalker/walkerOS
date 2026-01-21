import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
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
    let queryString: string | null = null;
    if (event.queryStringParameters) {
      const params = new URLSearchParams();
      Object.entries(event.queryStringParameters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      queryString = params.toString() || null;
    }
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
  if (!body || typeof body !== 'string') return body;
  try {
    const decoded = isBase64Encoded
      ? Buffer.from(body, 'base64').toString('utf8')
      : body;
    return JSON.parse(decoded);
  } catch {
    return body;
  }
}

export function isEventRequest(body: unknown): body is EventRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    'event' in body &&
    typeof (body as EventRequest).event === 'string'
  );
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
