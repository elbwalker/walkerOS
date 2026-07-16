import http from 'http';
import type { Logger, PreviewCrypto, PreviewKey } from '@walkeros/core';
import { verifyActivation } from '@walkeros/core';

const PREVIEW_LOG = '[walkerOS:preview]';

/**
 * Resolved config for the preview intake gate. Built once at boot (from the
 * `WALKEROS_PREVIEW_*` env by {@link import('../commands/run/pipeline.js').resolvePreviewGate})
 * and handed to {@link createHealthServer}. When supplied, the gate is armed:
 * every request that would be delegated to the flow source must carry a grant
 * cryptographically bound to THIS container's session. When omitted, the runner
 * is a production container and intake is byte-identical to today.
 *
 * `health-server.ts` reads no env itself — the container's identity arrives
 * fully resolved in this struct.
 */
export interface PreviewGateConfig {
  /**
   * The full keyring (current active key plus any retired-but-still-live keys)
   * this container accepts grants from. Rotation must not break a session whose
   * web deployment still mints against a retired kid, so verification runs
   * against every key here, not just the newest.
   */
  keyring: PreviewKey[];
  /** Expected issuer, e.g. 'app:stage'. A foreign issuer is rejected. */
  iss: string;
  /** This container's baked per-project binding. */
  pb: string;
  /** The one session this container is bound to. Grants for any other session are rejected. */
  expectSession: { ses: string; sb: string };
  /** Injectable clock (epoch ms). Defaults to `Date.now()`. */
  now?: () => number;
  /** Injectable WebCrypto. Defaults to `globalThis.crypto` inside `verifyActivation`. */
  crypto?: PreviewCrypto;
}

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
   * `/ready` returns 503 and surfaces the reason. Clearing it requires a
   * subsequent successful `setReady(true)`.
   */
  setFailed(reason: string): void;
  /**
   * Degrade readiness from an out-of-band condition (e.g. a sustained loop of
   * uncaught exceptions / unhandled rejections from a wedged step or
   * third-party lib). `/ready` returns 503 with a `degraded` status so the
   * orchestrator recycles the container instead of letting a half-open writer
   * hot-loop behind a 200. Distinct from `setFailed` (construction failure) so
   * the surfaced cause is honest. Cleared only by a subsequent `setReady(true)`
   * (called at boot, not by a hot-swap), so in practice degraded clears when
   * the orchestrator recycles the container and a fresh process boots.
   */
  setDegraded(reason: string): void;
  close(): Promise<void>;
}

/**
 * Answer a CORS preflight. The gate sits above the flow source's own `cors`
 * middleware, so when armed it owns `OPTIONS`. Reproduce today's wildcard answer
 * (the express source's `setCorsHeaders`: `*`, `GET, POST, OPTIONS`, 204 — it
 * does not echo Origin). Allow-headers REFLECTS whatever the browser asks for,
 * exactly like the ungated production path's `cors` middleware: a static list
 * silently blocks the real request whenever a destination adds a header (the
 * api destination's `traceparent` trace stitching did exactly that — every
 * browser-forwarded event to the session container failed preflight while
 * production kept working). Reflection grants nothing: the preflight carries no
 * auth and the actual request still has to pass the grant gate. The grant is
 * NEVER required here: browsers cannot attach custom headers to a preflight,
 * and no credentials ride these requests (the grant header is the auth), so
 * wildcard is safe.
 */
function answerPreviewPreflight(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  const requested = req.headers['access-control-request-headers'];
  const requestedHeaders = Array.isArray(requested)
    ? requested.join(', ')
    : requested;
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      requestedHeaders || 'Content-Type, X-Walkeros-Preview',
    Vary: 'Access-Control-Request-Headers',
  });
  res.end();
}

/**
 * Reject an unauthenticated request. The body is generic on purpose: an
 * unauthenticated caller learns nothing about why it failed (the precise reason
 * is logged server-side). Wildcard ACAO lets a legitimate cross-origin caller
 * read the 401 cleanly instead of seeing an opaque network error.
 */
function rejectPreview(res: http.ServerResponse): void {
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

/** Read the grant header. Node lowercases incoming header names. */
function readGrantHeader(req: http.IncomingMessage): string {
  const raw = req.headers['x-walkeros-preview'];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] ?? '';
  return '';
}

/**
 * Verify the request's grant against the container's session, then delegate on
 * success or 401 on failure. Reads only headers — never touches the request body
 * stream, so the flow source receives the request intact after the gate passes.
 * `verifyActivation` never throws (it returns a reason), but the rejection
 * handler fails closed anyway so a surprise rejection can never fall through
 * to the flow. Downstream `onPass()` failures are handled separately: they are
 * the flow's own errors, not verification errors, and must never answer 401 —
 * by the time the handler runs, the response may already have started.
 */
function guardPreviewIntake(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  gate: PreviewGateConfig,
  logger: Logger.Instance,
  onPass: () => void,
): void {
  verifyActivation(readGrantHeader(req), {
    keyring: gate.keyring,
    iss: gate.iss,
    pb: gate.pb,
    expectSession: gate.expectSession,
    source: 'storage',
    now: gate.now ? gate.now() : Date.now(),
    crypto: gate.crypto,
  }).then(
    (result) => {
      if (!result.ok) {
        logger.info(
          `${PREVIEW_LOG} rejected ${req.method} ${req.url}: ${result.reason}`,
        );
        rejectPreview(res);
        return;
      }
      try {
        onPass();
      } catch (error) {
        logger.info(
          `${PREVIEW_LOG} flow handler error on ${req.method} ${req.url}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        } else {
          res.end();
        }
      }
    },
    (error) => {
      logger.info(
        `${PREVIEW_LOG} verification error on ${req.method} ${req.url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      rejectPreview(res);
    },
  );
}

export function createHealthServer(
  port: number,
  logger: Logger.Instance,
  previewGate?: PreviewGateConfig,
): Promise<HealthServer> {
  return new Promise((resolve, reject) => {
    let flowHandler: http.RequestListener | null = null;
    // Functional readiness, independent of the flow's HTTP handler: 200 only
    // after the collector is constructed. Orchestrators (Scaleway) gate traffic
    // on /ready, so this closes the pre-ready functional window at the source.
    let ready = false;
    let failureReason: string | null = null;
    // Distinguishes an out-of-band degrade (sustained uncaught error loop) from
    // a construction failure, so /ready surfaces the honest cause. Both yield
    // 503; only the status string differs.
    let degraded = false;

    const server = http.createServer((req, res) => {
      // Runner-owned health routes — always available
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
            : failureReason
              ? 'failed'
              : 'not_ready';
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify(
            failureReason && !ready
              ? { status, reason: failureReason }
              : { status },
          ),
        );
        return;
      }

      // Delegate to flow's HTTP handler. `/health` and `/ready` above are the
      // runner's own routes and stay outside any gate.
      const delegate = () => {
        if (flowHandler) {
          flowHandler(req, res);
          return;
        }
        // No flow handler — service unavailable
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No flow loaded' }));
      };

      // Preview intake gate: armed only when the container booted with a
      // resolved `previewGate`. It guards EVERY method delegated to the flow
      // source (POST, GET, PUT, anything) — a GET bypass would reopen the hole.
      // Only the CORS preflight is exempt, and the gate owns it. When inert
      // (production), delegation is byte-identical to today.
      if (previewGate) {
        if (req.method === 'OPTIONS') {
          answerPreviewPreflight(req, res);
          return;
        }
        guardPreviewIntake(req, res, previewGate, logger, delegate);
        return;
      }

      delegate();
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
            failureReason = null;
            degraded = false;
          }
        },
        setFailed(reason) {
          ready = false;
          degraded = false;
          failureReason = reason;
        },
        setDegraded(reason) {
          ready = false;
          degraded = true;
          failureReason = reason;
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
