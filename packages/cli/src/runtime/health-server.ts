import http from 'http';
import type { Logger } from '@walkeros/core';

export interface HealthServer {
  server: http.Server;
  setFlowHandler(handler: http.RequestListener | null): void;
  close(): Promise<void>;
}

export function createHealthServer(
  port: number,
  logger: Logger.Instance,
): Promise<HealthServer> {
  return new Promise((resolve, reject) => {
    let flowHandler: http.RequestListener | null = null;

    const server = http.createServer((req, res) => {
      // Runner-owned health routes — always available
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.url === '/ready' && req.method === 'GET') {
        const code = flowHandler ? 200 : 503;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ status: flowHandler ? 'ready' : 'not_ready' }),
        );
        return;
      }

      // Delegate to flow's HTTP handler
      if (flowHandler) {
        flowHandler(req, res);
        return;
      }

      // No flow handler — service unavailable
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No flow loaded' }));
    });

    server.keepAliveTimeout = 5000;
    server.headersTimeout = 10000;

    server.listen(port, '0.0.0.0', () => {
      logger.info(`Health server listening on port ${port}`);
      resolve({
        server,
        setFlowHandler(handler) {
          flowHandler = handler;
        },
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });

    server.on('error', reject);
  });
}
