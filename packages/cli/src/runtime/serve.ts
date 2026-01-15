/**
 * Serve mode - serve single file (typically generated bundle)
 */

import express from 'express';
import { resolve } from 'path';
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

  // Bundle path: ENV variable > config > default (resolve to absolute)
  const file = resolve(
    process.env.BUNDLE || config?.file || './dist/walker.js',
  );

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
      // Set content type before streaming
      res.type('application/javascript');

      // Allow dotfiles since file paths may include dotfile directories
      res.sendFile(file, { dotfiles: 'allow' }, (err) => {
        if (err && !res.headersSent) {
          const errCode = (err as NodeJS.ErrnoException).code;
          // Express 5 uses HTTP-style errors with status/statusCode
          const errStatus =
            (err as { status?: number; statusCode?: number }).status ||
            (err as { status?: number; statusCode?: number }).statusCode;

          // Log errors (except client disconnections)
          if (errCode !== 'ECONNABORTED') {
            logger.error(
              `sendFile error for ${file}: ${err.message} (code: ${errCode}, status: ${errStatus})`,
            );
          }

          // Send appropriate error response (check both Node.js codes and HTTP status)
          if (
            errStatus === 404 ||
            errCode === 'ENOENT' ||
            errCode === 'EISDIR' ||
            errCode === 'ENOTDIR'
          ) {
            res.status(404).send('File not found');
          } else if (errCode !== 'ECONNABORTED') {
            res.status(500).send('Internal server error');
          }
        }
      });
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
