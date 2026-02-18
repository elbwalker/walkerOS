import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { requestToData } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { ExpressSource, Types, EventRequest } from './types';
import { SettingsSchema } from './schemas';
import { setCorsHeaders, TRANSPARENT_GIF } from './utils';

/**
 * Express source initialization
 *
 * This source OWNS its HTTP server infrastructure:
 * - Creates Express application
 * - Sets up middleware (JSON parsing, CORS)
 * - Registers event collection endpoints (POST, GET, OPTIONS)
 * - Starts HTTP server (if port configured)
 * - Handles graceful shutdown
 *
 * @param context Source context with config, env, logger, id
 * @returns Express source instance with app and push handler
 */
export const sourceExpress = async (
  context: Source.Context<Types>,
): Promise<ExpressSource> => {
  const { config = {}, env } = context;

  // Validate and apply default settings
  const parsed = SettingsSchema.parse(config.settings || {});
  const settings = {
    ...parsed,
    paths: parsed.paths ?? (parsed.path ? [parsed.path] : ['/collect']),
  };

  const app = express();

  // Middleware setup - JSON body parsing with 10mb default limit
  app.use(express.json({ limit: '1mb' }));

  // CORS middleware (enabled by default)
  if (settings.cors !== false) {
    const corsOptions = settings.cors === true ? {} : settings.cors;
    app.use(cors(corsOptions));
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

      // Handle GET requests (pixel tracking)
      if (req.method === 'GET') {
        // Parse query parameters to event data using requestToData
        const parsedData = requestToData(req.url);

        // Send to collector
        if (parsedData && typeof parsedData === 'object') {
          await env.push(parsedData);
        }

        // Return 1x1 transparent GIF for pixel tracking
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(TRANSPARENT_GIF);
        return;
      }

      // Handle POST requests (standard event ingestion)
      if (req.method === 'POST') {
        const eventData = req.body;

        if (!eventData || typeof eventData !== 'object') {
          res.status(400).json({
            success: false,
            error: 'Invalid event: body must be an object',
          });
          return;
        }

        // Send event to collector
        await env.push(eventData);

        res.json({
          success: true,
          timestamp: Date.now(),
        });
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

  // Health check endpoints (if enabled)
  if (settings.status) {
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        source: 'express',
      });
    });

    app.get('/ready', (req, res) => {
      res.json({
        status: 'ready',
        timestamp: Date.now(),
        source: 'express',
      });
    });
  }

  // Source owns the HTTP server (if port configured)
  let server: ReturnType<typeof app.listen> | undefined;

  if (settings.port !== undefined) {
    server = app.listen(settings.port, () => {
      const statusRoutes = settings.status
        ? `\n   GET /health - Health check\n   GET /ready - Readiness check`
        : '';
      const routeLines = resolvedPaths
        .map((r) => {
          const methods = [...r.methods, 'OPTIONS'].join(', ');
          return `   ${methods} ${r.path}`;
        })
        .join('\n');
      env.logger.info(
        `Express source listening on port ${settings.port}\n` +
          routeLines +
          statusRoutes,
      );
    });

    // Graceful shutdown handlers
    const shutdownHandler = () => {
      if (server) {
        server.close();
      }
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  const instance: ExpressSource = {
    type: 'express',
    config: {
      ...config,
      settings,
    },
    push,
    app, // Expose app for advanced usage
    server, // Expose server (if started)
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
