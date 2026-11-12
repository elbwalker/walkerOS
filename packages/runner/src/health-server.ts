import http from 'http';
import type { Logger } from '@walkeros/core';
import { redactLine } from '@walkeros/core/node';

export interface HealthServer {
  server: http.Server;
  setFlowHandler(handler: http.RequestListener | null): void;
  /**
   * Mark the flow as genuinely ready to serve traffic. Set this only after the
   * bundle has been parsed and the collector constructed successfully. `/ready`
   * returns 200 exclusively while ready is true.
   */
  setReady(ready: boolean): void;
  /**
   * Mark readiness as failed with a short reason (e.g. a construction error).
   * `/ready` returns 503 with a generic reason; the detail is redacted and
   * written to the log (and so the log ring), never echoed on the endpoint,
   * which is internet-reachable. Clearing it requires a subsequent successful
   * `setReady(true)`.
   */
  setFailed(reason: string): void;
  /**
   * Degrade readiness from an out-of-band condition (e.g. a sustained loop of
   * uncaught exceptions / unhandled rejections from a wedged step or
   * third-party lib). `/ready` returns 503 with a `degraded` status so the
   * orchestrator recycles the container instead of letting a half-open writer
   * hot-loop behind a 200. Distinct from `setFailed` (construction failure) so
   * the surfaced cause is honest. Cleared only by a subsequent `setReady(true)`
   * (called at boot), so in practice degraded clears when the orchestrator
   * recycles the container and a fresh process boots. Like `setFailed`, the
   * reason goes to the log, not to `/ready`.
   */
  setDegraded(reason: string): void;
  close(): Promise<void>;
}

/**
 * The generic reasons `/ready` answers with. The endpoint is internet-reachable,
 * so it never echoes a raw error message (which can carry a secret or an
 * internal path); the redacted detail is in the log.
 */
const READY_REASON = {
  failed: 'flow failed to start, see the runtime log',
  degraded: 'flow degraded, see the runtime log',
} as const;

export function createHealthServer(
  port: number,
  logger: Logger.Instance,
): Promise<HealthServer> {
  return new Promise((resolve, reject) => {
    let flowHandler: http.RequestListener | null = null;
    // Functional readiness, independent of the flow's HTTP handler: 200 only
    // after the collector is constructed. Orchestrators (Scaleway) gate traffic
    // on /ready, so this closes the pre-ready functional window at the source.
    let ready = false;
    let failed = false;
    // Distinguishes an out-of-band degrade (sustained uncaught error loop) from
    // a construction failure, so /ready surfaces the honest cause. Both yield
    // 503; only the status string differs.
    let degraded = false;

    const server = http.createServer((req, res) => {
      // Runner-owned health routes, always available
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.url === '/ready' && req.method === 'GET') {
        const code = ready ? 200 : 503;
        const status = ready
          ? 'ready'
          : degraded
            ? 'degraded'
            : failed
              ? 'failed'
              : 'not_ready';
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            status === 'failed' || status === 'degraded'
              ? { status, reason: READY_REASON[status] }
              : { status },
          ),
        );
        return;
      }

      // Delegate to flow's HTTP handler. `/health` and `/ready` above are the
      // runner's own routes.
      if (flowHandler) {
        flowHandler(req, res);
        return;
      }
      // No flow handler, service unavailable
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
        setReady(value) {
          ready = value;
          if (value) {
            failed = false;
            degraded = false;
          }
        },
        setFailed(reason) {
          ready = false;
          degraded = false;
          failed = true;
          logger.error(`Readiness failed: ${redactLine(reason)}`);
        },
        setDegraded(reason) {
          ready = false;
          degraded = true;
          failed = false;
          logger.error(`Readiness degraded: ${redactLine(reason)}`);
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
