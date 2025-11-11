import express from 'express';
import path from 'path';
import type { DockerConfig } from '../config/schema';

/**
 * Run serve mode - serve static files (typically generated bundles)
 */
export async function runServeMode(config: DockerConfig): Promise<void> {
  // Port priority: ENV variable > config > default
  const port = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : config.docker?.port || 8080;
  // Host priority: ENV variable > config > default
  const host = process.env.HOST || config.docker?.host || '0.0.0.0';
  // Static dir priority: ENV variable > config > default
  const staticDir =
    process.env.STATIC_DIR ||
    config.docker?.serve?.staticDir ||
    path.resolve('/app/dist');

  console.log('📁 Serve mode: Starting static file server...');
  console.log(`   Directory: ${staticDir}`);
  console.log(`   Address: http://${host}:${port}`);

  try {
    const app = express();

    // Serve static files
    app.use(express.static(staticDir));

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        mode: 'serve',
        staticDir,
      });
    });

    // Start server
    const server = app.listen(port, host, () => {
      console.log(`✅ Server listening on http://${host}:${port}`);
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
