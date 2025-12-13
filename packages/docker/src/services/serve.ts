import express from 'express';
import type { Logger } from '@walkeros/core';
import { VERSION } from '../version';

export interface ServeConfig {
  port?: number;
  host?: string;
  servePath?: string;
  serveName?: string;
  file?: string;
}

/**
 * Run serve mode - serve single file (typically generated bundle)
 *
 * @param config - Server configuration
 * @param logger - Logger instance for output
 */
export async function runServeMode(
  config: ServeConfig | undefined,
  logger: Logger.Instance,
): Promise<void> {
  // Port priority: ENV variable > config > default
  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : config?.port || 8080;

  // Host priority: ENV variable > config > default
  const host = process.env.HOST || config?.host || '0.0.0.0';

  // File path: ENV variable > config > baked-in default
  const file = process.env.FILE || config?.file || '/app/web-serve.js';

  // Serve name (filename in URL): ENV variable > config > default
  const serveName = process.env.SERVE_NAME || config?.serveName || 'walker.js';

  // Serve path (URL directory): ENV variable > config > default (empty = root)
  const servePath = process.env.SERVE_PATH || config?.servePath || '';

  // Build full URL path
  const urlPath = servePath ? `/${servePath}/${serveName}` : `/${serveName}`;

  logger.info('Starting single-file server...');
  logger.info(`File: ${file}`);
  logger.info(`URL: http://${host}:${port}${urlPath}`);

  try {
    const app = express();

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: VERSION,
        timestamp: Date.now(),
        mode: 'serve',
        file: file,
        url: urlPath,
      });
    });

    // Serve single file at custom URL path
    app.get(urlPath, (req, res) => {
      res.sendFile(file);
    });

    // Start server
    const server = app.listen(port, host, () => {
      logger.info(`Server listening on http://${host}:${port}`);
      logger.info(`GET ${urlPath} - Bundle file`);
      logger.info(`GET /health - Health check`);
    });

    // Graceful shutdown
    const shutdownHandler = (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Server failed: ${message}`);
    process.exit(1);
  }
}
