import express from 'express';
import path from 'path';

export interface ServeConfig {
  port?: number;
  host?: string;
  servePath?: string;
  serveName?: string;
  filePath?: string;
}

/**
 * Run serve mode - serve single file (typically generated bundle)
 */
export async function runServeMode(config?: ServeConfig): Promise<void> {
  // Port priority: ENV variable > config > default
  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : config?.port || 8080;

  // Host priority: ENV variable > config > default
  const host = process.env.HOST || config?.host || '0.0.0.0';

  // File path: ENV variable > config > baked-in default
  const filePath =
    process.env.FILE_PATH || config?.filePath || '/app/web-serve.mjs';

  // Serve name (filename in URL): ENV variable > config > default
  const serveName = process.env.SERVE_NAME || config?.serveName || 'walker.js';

  // Serve path (URL directory): ENV variable > config > default (empty = root)
  const servePath = process.env.SERVE_PATH || config?.servePath || '';

  // Build full URL path
  const urlPath = servePath ? `/${servePath}/${serveName}` : `/${serveName}`;

  console.log('📁 Serve mode: Starting single-file server...');
  console.log(`   File: ${filePath}`);
  console.log(`   URL: http://${host}:${port}${urlPath}`);

  try {
    const app = express();

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        mode: 'serve',
        file: filePath,
        url: urlPath,
      });
    });

    // Serve single file at custom URL path
    app.get(urlPath, (req, res) => {
      res.sendFile(filePath);
    });

    // Start server
    const server = app.listen(port, host, () => {
      console.log(`✅ Server listening on http://${host}:${port}`);
      console.log(`   GET ${urlPath} - Bundle file`);
      console.log(`   GET /health - Health check`);
    });

    // Graceful shutdown
    const shutdownHandler = (signal: string) => {
      console.log(`\n⏹️  Received ${signal}, shutting down...`);
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Server failed:', error);
    process.exit(1);
  }
}
