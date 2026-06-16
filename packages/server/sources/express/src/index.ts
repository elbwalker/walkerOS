import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { requestToData, createRespond } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { ExpressSource, Types, EventRequest } from './types';
import { setCorsHeaders, TRANSPARENT_GIF } from './utils';

/**
 * Normalize an unknown rejection reason into an Error for the logger.
 * A fire-and-forget push can reject with any value; the logger accepts
 * `string | Error`, so non-Error reasons are wrapped.
 */
const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Express source initialization
 *
 * This source OWNS its HTTP server infrastructure:
 * - Creates Express application
 * - Sets up middleware (JSON parsing, CORS)
 * - Registers event collection endpoints (POST, GET, OPTIONS)
 * - Starts HTTP server (if port configured)
 * - Provides destroy() for graceful shutdown (called by runner)
 *
 * @param context Source context with config, env, logger, id
 * @returns Express source instance with app and push handler
 */
export const sourceExpress = async (
  context: Source.Context<Types>,
): Promise<ExpressSource> => {
  const { config = {}, env } = context;
  const expressLib = env.express ?? express;
  const corsLib = env.cors ?? cors;

  // Apply defaults (no runtime validation — flow.json is developer-controlled).
  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    cors: userSettings.cors ?? true,
    paths:
      userSettings.paths ??
      (userSettings.path ? [userSettings.path] : ['/collect']),
  };

  // Respond-first by default: a 2xx means "accepted", not "delivered".
  // Standardized on the source config (Source.Config.async), not settings.
  const respondFirst = config.async ?? true;

  const app = expressLib();

  // Body parsing — JSON content-type plus text/plain so navigator.sendBeacon
  // payloads (which the browser forces to text/plain;charset=UTF-8) are also
  // parsed as JSON. 1mb default limit.
  app.use(
    expressLib.json({
      limit: '1mb',
      type: ['application/json', 'text/plain'],
    }),
  );

  // CORS middleware (enabled by default)
  if (settings.cors !== false) {
    const corsOptions = settings.cors === true ? {} : settings.cors;
    app.use(corsLib(corsOptions));
  }

  /**
   * Request handler - transforms HTTP requests into walker events
   * Supports POST (JSON body), GET (query params), and OPTIONS (CORS preflight)
   *
   * Each inbound request gets its own `withScope` invocation. The per-scope
   * env carries this request's `ingest` and `respond` end to end, so
   * concurrent requests never crosstalk through source-factory state.
   */
  const push = async (req: Request, res: Response): Promise<void> => {
    try {
      // Handle OPTIONS for CORS preflight (no scope needed: no event, no ingest)
      if (req.method === 'OPTIONS') {
        setCorsHeaders(res, settings.cors);
        res.status(204).send();
        return;
      }

      // Create per-request respond — first call wins (idempotent)
      const respond = createRespond((options) => {
        const status = options.status ?? 200;
        if (options.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            res.set(key, value);
          }
        }
        res.status(status);
        const body = options.body;
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
          res.send(body);
        } else if (body instanceof Uint8Array) {
          // A decoded cache value surfaces binary as a plain Uint8Array,
          // not a Node Buffer; send it as bytes (res.json would corrupt it).
          res.send(Buffer.from(body));
        } else {
          res.json(body);
        }
      });

      await context.withScope(req, respond, async (env) => {
        // Handle GET requests (pixel tracking)
        if (req.method === 'GET') {
          // Parse query parameters to event data using requestToData
          const parsedData = requestToData(req.url);

          // Default GIF body (idempotent fallback; skipped if a step already
          // called respond, e.g. a cache/asset destination serving real bytes).
          const respondGif = () =>
            respond({
              body: TRANSPARENT_GIF,
              headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
              },
            });

          if (parsedData && typeof parsedData === 'object') {
            if (respondFirst) {
              // Respond-first: the tracking pixel must return instantly and
              // never block on backend delivery. Fire the push without
              // awaiting; a rejected push is logged (destination errors are
              // DLQ'd inside the collector). A 2xx means "accepted", not
              // "delivered".
              respondGif();
              env.push(parsedData).catch((err: unknown) => {
                env.logger.error(toError(err));
              });
            } else {
              // Synchronous: await the push so a step (e.g. a cache/asset
              // destination) can respond with real content before the GIF
              // fallback applies.
              await env.push(parsedData);
              respondGif();
            }
          } else {
            respondGif();
          }
          return;
        }

        // Handle POST requests (standard event ingestion)
        if (req.method === 'POST') {
          const eventData =
            req.body && typeof req.body === 'object' ? req.body : {};

          if (respondFirst) {
            // Respond-first ("accepted"), then deliver asynchronously. A
            // rejected push is logged, not surfaced to the client and not left
            // unhandled (destination errors are DLQ'd inside the collector).
            respond({ body: { success: true, timestamp: Date.now() } });
            env.push(eventData).catch((err: unknown) => {
              env.logger.error(toError(err));
            });
          } else {
            // Synchronous ack: wait for delivery to settle before responding.
            await env.push(eventData);
            respond({ body: { success: true, timestamp: Date.now() } });
          }
          return;
        }

        // Unsupported method
        res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST, GET, or OPTIONS.',
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  // Register handlers per route config
  const resolvedPaths = settings.paths.map((entry) =>
    typeof entry === 'string'
      ? { path: entry, methods: ['GET', 'POST'] as const }
      : {
          path: entry.path,
          methods: entry.methods || (['GET', 'POST'] as const),
        },
  );

  for (const route of resolvedPaths) {
    if (route.methods.includes('POST')) app.post(route.path, push);
    if (route.methods.includes('GET')) app.get(route.path, push);
    app.options(route.path, push); // Always register OPTIONS for CORS
  }

  // Source owns the HTTP server (if port configured)
  let server: ReturnType<typeof app.listen> | undefined;

  if (settings.port !== undefined) {
    server = app.listen(settings.port, () => {
      const routeLines = resolvedPaths
        .map((r) => {
          const methods = [...r.methods, 'OPTIONS'].join(', ');
          return `   ${methods} ${r.path}`;
        })
        .join('\n');
      env.logger.info(
        `Express source listening on port ${settings.port}\n` + routeLines,
      );
    });
  }

  const instance: ExpressSource = {
    type: 'express',
    config: {
      ...config,
      settings,
    },
    push,
    httpHandler: app,
    app,
    server,
    destroy: (_context) =>
      new Promise<void>((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };

  return instance;
};

// Export types (avoid re-exporting duplicates from schemas)
export type {
  ExpressSource,
  Config,
  PartialConfig,
  Types,
  EventRequest,
  EventResponse,
  RequestBody,
  ResponseBody,
  Push,
  Env,
  Mapping,
  InitSettings,
  Settings,
  RouteConfig,
  RouteMethod,
} from './types';

// Export utils
export { setCorsHeaders, TRANSPARENT_GIF } from './utils';

export default sourceExpress;
