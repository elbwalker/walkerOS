import type { CorsOptions } from './schemas';

export function createCorsHeaders(
  corsConfig: boolean | CorsOptions = true,
  requestOrigin?: string | null,
): Headers {
  const headers = new Headers();

  if (corsConfig === false) return headers;

  if (corsConfig === true) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  } else {
    if (corsConfig.origin) {
      let origin: string;
      if (Array.isArray(corsConfig.origin)) {
        origin =
          requestOrigin && corsConfig.origin.includes(requestOrigin)
            ? requestOrigin
            : corsConfig.origin[0];
      } else {
        origin = corsConfig.origin;
      }
      headers.set('Access-Control-Allow-Origin', origin);
    }

    if (corsConfig.methods) {
      headers.set(
        'Access-Control-Allow-Methods',
        corsConfig.methods.join(', '),
      );
    }

    if (corsConfig.headers) {
      headers.set(
        'Access-Control-Allow-Headers',
        corsConfig.headers.join(', '),
      );
    }

    if (corsConfig.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (corsConfig.maxAge) {
      headers.set('Access-Control-Max-Age', String(corsConfig.maxAge));
    }
  }

  return headers;
}

export const TRANSPARENT_GIF_BASE64 =
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function createPixelResponse(corsHeaders?: Headers): Response {
  const binaryString = atob(TRANSPARENT_GIF_BASE64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'image/gif');
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  return new Response(bytes, { status: 200, headers });
}

export function createJsonResponse(
  body: unknown,
  status = 200,
  corsHeaders?: Headers,
): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), { status, headers });
}
