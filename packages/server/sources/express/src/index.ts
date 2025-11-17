import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { requestToData } from '@walkeros/core';
import type {
  ExpressSource,
  PartialConfig,
  Types,
  EventRequest,
} from './types';
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
 * @param config Partial source configuration
 * @param env Source environment with push, command, elb functions
 * @returns Express source instance with app and push handler
 */
export const sourceExpress = async (
  config: PartialConfig,
  env: Types['env'],
): Promise<ExpressSource> => {
  // Validate and apply default settings
  const settings = SettingsSchema.parse(config.settings || {});

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

  // Register event collection endpoint (handles POST, GET, OPTIONS)
  app.post(settings.path, push);
  app.get(settings.path, push);
  app.options(settings.path, push);

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
      console.log(`✅ Express source listening on port ${settings.port}`);
      console.log(`   POST ${settings.path} - Event collection (JSON body)`);
      console.log(`   GET ${settings.path} - Pixel tracking (query params)`);
      console.log(`   OPTIONS ${settings.path} - CORS preflight`);
      if (settings.status) {
        console.log(`   GET /health - Health check`);
        console.log(`   GET /ready - Readiness check`);
      }
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
  PartialConfig,
  Types,
  EventRequest,
  EventResponse,
  RequestBody,
  ResponseBody,
  Push,
  Env,
  Mapping,
} from './types';

// Export utils
export { setCorsHeaders, TRANSPARENT_GIF } from './utils';
