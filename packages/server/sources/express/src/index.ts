import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { requestToData, createRespond } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { ExpressSource, Types, EventRequest } from './types';
import { setCorsHeaders, TRANSPARENT_GIF } from './utils';

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

  const app = expressLib();

  // Middleware setup - JSON body parsing with 10mb default limit
  app.use(expressLib.json({ limit: '1mb' }));
  app.use(expressLib.text({ limit: '1mb' }));

  // CORS middleware (enabled by default)
  if (settings.cors !== false) {
    const corsOptions = settings.cors === true ? {} : settings.cors;
    app.use(corsLib(corsOptions));
  }

  /**
   * Request handler - transforms HTTP requests into walker events
   * Supports POST (JSON body), GET (query params), and OPTIONS (CORS preflight)
   */
  const push = async (req: Request, res: Response): Promise<void> => {
    try {
      // Handle OPTIONS for CORS preflight
      if (req.method === 'OPTIONS') {
        setCorsHeaders(res, settings.cors);
        res.status(204).send();
        return;
      }

      // Extract ingest metadata from request (if config.ingest is defined)
      await context.setIngest(req);

      // Create per-request respond — first call wins (idempotent)
      const respond = createRespond((options) => {
        const status = options.status ?? 200;
        if (options.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            res.set(key, value);
          }
        }
        res.status(status);
        if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
          res.send(options.body);
        } else {
          res.json(options.body);
        }
      });
      context.setRespond(respond);

      // Handle GET requests (pixel tracking)
      if (req.method === 'GET') {
        // Parse query parameters to event data using requestToData
        const parsedData = requestToData(req.url);

        // Send to collector
        if (parsedData && typeof parsedData === 'object') {
          await env.push(parsedData);
        }

        // Default: 1x1 GIF (skipped if a step already called respond)
        respond({
          body: TRANSPARENT_GIF,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        return;
      }

      // Handle POST requests (standard event ingestion)
      if (req.method === 'POST') {
        const eventData =
          req.body && typeof req.body === 'object' ? req.body : {};

        await env.push(eventData);

        respond({ body: { success: true, timestamp: Date.now() } });
        return;
      }

      // Unsupported method
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST, GET, or OPTIONS.',
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
