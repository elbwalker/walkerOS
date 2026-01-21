import type { Response } from 'express';
import type { CorsOptions } from './schemas';

/**
 * Set CORS headers on response
 *
 * @param res Express response object
 * @param corsConfig CORS configuration (false = disabled, true = allow all, object = custom)
 */
export function setCorsHeaders(
  res: Response,
  corsConfig: boolean | CorsOptions = true,
): void {
  if (corsConfig === false) return;

  if (corsConfig === true) {
    // Simple CORS - allow all
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  } else {
    // Custom CORS configuration
    if (corsConfig.origin) {
      const origin = Array.isArray(corsConfig.origin)
        ? corsConfig.origin.join(', ')
        : corsConfig.origin;
      res.set('Access-Control-Allow-Origin', origin);
    }

    if (corsConfig.methods) {
      res.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    }

    if (corsConfig.headers) {
      res.set('Access-Control-Allow-Headers', corsConfig.headers.join(', '));
    }

    if (corsConfig.credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    if (corsConfig.maxAge) {
      res.set('Access-Control-Max-Age', String(corsConfig.maxAge));
    }
  }
}

/**
 * 1x1 transparent GIF for pixel tracking
 * Base64-encoded GIF (43 bytes)
 */
export const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);
