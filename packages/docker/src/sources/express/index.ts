import express, { type Request, type Response } from 'express';
import cors from 'cors';
import type { Source } from '@walkeros/core';

/**
 * Express source settings
 */
export interface ExpressSourceSettings {
  endpoint: string;
  port?: number;
  cors?: boolean | cors.CorsOptions;
  jsonLimit?: string;
}

/**
 * Express source instance with HTTP server
 */
export interface ExpressSourceInstance extends Omit<Source.Instance, 'push'> {
  type: 'express';
  app: express.Application;
  push: (req: Request, res: Response) => Promise<void>;
}

/**
 * Express source initialization
 *
 * This source OWNS its HTTP server infrastructure:
 * - Creates Express application
 * - Sets up middleware (JSON parsing, CORS)
 * - Registers event collection endpoint
 * - Starts HTTP server
 * - Handles graceful shutdown
 */
export const sourceExpress: Source.Init = async (config, env) => {
  const settings = (config.settings || {
    endpoint: '/collect',
    port: 8080,
    cors: true,
    jsonLimit: '10mb',
  }) as ExpressSourceSettings;

  const app = express();

  // Middleware setup
  app.use(express.json({ limit: settings.jsonLimit || '10mb' }));

  if (settings.cors !== false) {
    const corsOptions = settings.cors === true ? {} : settings.cors;
    app.use(cors(corsOptions));
  }

  /**
   * Request handler - transforms HTTP requests into walker events
   */
  const push = async (req: Request, res: Response): Promise<void> => {
    try {
      const event = req.body;

      if (!event || typeof event !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid event: body must be an object',
        });
        return;
      }

      // Send event to collector
      if (env && 'push' in env && typeof env.push === 'function') {
        await env.push(event);
      }

      res.json({
        success: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[sourceExpress] Event processing error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  // Register event collection endpoint
  app.post(settings.endpoint, push);

  // Health check endpoints
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

  // Source owns the HTTP server
  let server: ReturnType<typeof app.listen> | null = null;

  if (settings.port) {
    server = app.listen(settings.port, () => {
      console.log(`✅ Express source listening on port ${settings.port}`);
      console.log(`   POST ${settings.endpoint} - Event collection`);
      console.log(`   GET /health - Health check`);
      console.log(`   GET /ready - Readiness check`);
    });

    // Graceful shutdown
    const shutdownHandler = () => {
      if (server) {
        console.log('⏹️  Express source shutting down...');
        server.close(() => {
          console.log('✅ Express source closed');
        });
      }
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  const instance: ExpressSourceInstance = {
    type: 'express',
    config,
    push,
    app, // Expose for advanced usage
  };

  return instance as unknown as Source.Instance;
};
