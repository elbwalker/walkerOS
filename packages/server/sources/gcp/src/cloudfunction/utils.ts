import type { RequestBody, EventRequest, CorsOptions, Response } from './types';

export function isEventRequest(body: RequestBody): body is EventRequest {
  return 'event' in body && typeof body.event === 'string';
}

export function setCorsHeaders(
  res: Response,
  corsOptions: boolean | CorsOptions,
): void {
  if (!corsOptions) return;

  if (corsOptions === true) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
  } else {
    if (corsOptions.origin) {
      const origin = Array.isArray(corsOptions.origin)
        ? corsOptions.origin.join(', ')
        : corsOptions.origin;
      res.set('Access-Control-Allow-Origin', origin);
    }
    if (corsOptions.methods) {
      res.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    }
    if (corsOptions.headers) {
      res.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '));
    }
    if (corsOptions.credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    if (corsOptions.maxAge !== undefined) {
      res.set('Access-Control-Max-Age', corsOptions.maxAge.toString());
    }
  }
}
