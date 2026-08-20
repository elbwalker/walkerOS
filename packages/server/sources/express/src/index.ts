import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import { requestToData, createRespond } from '@walkeros/core';
import type { Elb, Logger, Source } from '@walkeros/core';
import type { ExpressSource, Types, EventRequest } from './types';
import { setCorsHeaders, TRANSPARENT_GIF } from './utils';

/**
 * Normalize an unknown rejection reason into an Error for the logger.
 * A fire-and-forget push can reject with any value; the logger accepts
 * `string | Error`, so non-Error reasons are wrapped.
 */
const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Settle handler for respond-first pushes: the HTTP ack already went out,
 * so a pipeline decline (ok:false) or a rejection can only surface here.
 * Warn on decline; the collector has already error-logged a thrown pipeline
 * failure, this line ties the outcome to the request that was acked.
 * Invalid-input rejections stay silent here: the collector already warned
 * and counted them at the pipeline gate.
 */
const settleAfterAck = (
  result: Promise<Elb.PushResult>,
  logger: Logger.Instance,
): void => {
  result
    .then(
      (settled) => {
        if (settled?.ok === false && settled.invalid !== true) {
          logger.warn('Event not processed after ack', {
            failed: settled.failed ? Object.keys(settled.failed) : [],
          });
        }
      },
      (err: unknown) => {
        logger.error(toError(err));
      },
    )
    // The derived promise would otherwise float: a throw inside the
    // handlers above (e.g. a faulty logger) must not surface as an
    // unhandled rejection on a fire-and-forget path.
    .catch(() => undefined);
};

/**
 * Client-caused body failure raised by the route-scoped JSON parser:
 * unparseable JSON, oversized payload, unsupported charset or encoding,
 * an aborted request, or a content-length mismatch. Identified by the
 * error type marker the parser attaches, so unrelated middleware errors
 * that happen to carry a 4xx status are never treated as body rejections.
 * Carries the HTTP status to answer with and, for parse failures, the raw
 * body for debug diagnostics.
 */
interface RequestBodyError extends Error {
  status: number;
  type: string;
  body?: unknown;
}

// Type markers body-parser and raw-body attach to client-caused body
// failures (see body-parser lib/read.js and raw-body index.js).
const REQUEST_BODY_ERROR_TYPES = new Set([
  'entity.parse.failed',
  'entity.verify.failed',
  'entity.too.large',
  'charset.unsupported',
  'encoding.unsupported',
  'request.aborted',
  'request.size.invalid',
]);

const isRequestBodyError = (err: unknown): err is RequestBodyError => {
  if (!(err instanceof Error)) return false;
  if (!('status' in err) || !('type' in err)) return false;
  const candidate: { status?: unknown; type?: unknown } = err;
  return (
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500 &&
    typeof candidate.type === 'string' &&
    REQUEST_BODY_ERROR_TYPES.has(candidate.type)
  );
};

/**
 * Express source initialization
 *
 * This source OWNS its HTTP server infrastructure:
 * - Creates Express application
 * - Sets up middleware (JSON parsing, CORS)
 * - Registers event collection endpoints (POST, GET, OPTIONS)
 * - Starts HTTP server (if port configured)
 * - Provides destroy() for graceful shutdown (called by runner)
 *
 * @param context Source context with config, env, logger, id
 * @returns Express source instance with app and push handler
 */
export const sourceExpress = async (
  context: Source.Context<Types>,
): Promise<ExpressSource> => {
  const { config = {}, env } = context;
  const expressLib = env.express ?? express;
  const corsLib = env.cors ?? cors;

  // Apply defaults (no runtime validation — flow.json is developer-controlled).
  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    cors: userSettings.cors ?? true,
    paths:
      userSettings.paths ??
      (userSettings.path ? [userSettings.path] : ['/collect']),
  };

  // Respond-first by default: a 2xx means "accepted", not "delivered".
  // Standardized on the source config (Source.Config.async), not settings.
  const respondFirst = config.async ?? true;

  // Rejection volume belongs in collector.status, not in per-request logs.
  // Lazy entry creation mirrors the collector's own sources bookkeeping.
  // Guarded: unit harnesses may run the handler with a bare collector stub.
  const countRejected = (): void => {
    const sources = context.collector.status?.sources;
    if (!sources) return;
    if (!sources[context.id]) {
      sources[context.id] = { count: 0, duration: 0 };
    }
    const sourceStatus = sources[context.id];
    sourceStatus.rejected = (sourceStatus.rejected ?? 0) + 1;
  };

  const app = expressLib();

  // The framework identity is of no use to callers and only helps someone
  // probing the endpoint pick an exploit.
  app.disable('x-powered-by');

  // Body parsing per configured POST route: JSON content-type plus text/plain
  // so navigator.sendBeacon payloads (which the browser forces to
  // text/plain;charset=UTF-8) are also parsed as JSON. 1mb default limit.
  // Route-scoped so unmatched paths (scanner noise) fall through to the
  // default 404 without ever touching the parser.
  const jsonParser = expressLib.json({
    limit: '1mb',
    type: ['application/json', 'text/plain'],
  });

  // Content-Type on some responses is flow-controlled (a cache or asset step
  // can set it through respond({ headers })), so sniffing stays off. Registered
  // before CORS and unconditionally, so it also covers the default 404 and the
  // body-rejection responses.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // CORS middleware (enabled by default)
  if (settings.cors !== false) {
    const corsOptions = settings.cors === true ? {} : settings.cors;
    app.use(corsLib(corsOptions));
  }

  /**
   * Request handler - transforms HTTP requests into walker events
   * Supports POST (JSON body), GET (query params), and OPTIONS (CORS preflight)
   *
   * Each inbound request gets its own `withScope` invocation. The per-scope
   * env carries this request's `ingest` and `respond` end to end, so
   * concurrent requests never crosstalk through source-factory state.
   */
  const push = async (req: Request, res: Response): Promise<void> => {
    try {
      // Handle OPTIONS for CORS preflight (no scope needed: no event, no ingest)
      if (req.method === 'OPTIONS') {
        setCorsHeaders(res, settings.cors);
        res.status(204).send();
        return;
      }

      // Create per-request respond — first call wins (idempotent)
      const respond = createRespond((options) => {
        const status = options.status ?? 200;
        if (options.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            res.set(key, value);
          }
        }
        res.status(status);
        const body = options.body;
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
          res.send(body);
        } else if (body instanceof Uint8Array) {
          // A decoded cache value surfaces binary as a plain Uint8Array,
          // not a Node Buffer; send it as bytes (res.json would corrupt it).
          res.send(Buffer.from(body));
        } else {
          res.json(body);
        }
      });

      await context.withScope(req, respond, async (env) => {
        // Handle GET requests (pixel tracking)
        if (req.method === 'GET') {
          // Parse query parameters to event data using requestToData
          const parsedData = requestToData(req.url);

          // Default GIF body (idempotent fallback; skipped if a step already
          // called respond, e.g. a cache/asset destination serving real bytes).
          const respondGif = () =>
            respond({
              body: TRANSPARENT_GIF,
              headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
              },
            });

          if (parsedData && typeof parsedData === 'object') {
            if (respondFirst) {
              // Respond-first: the tracking pixel must return instantly and
              // never block on backend delivery. Fire the push without
              // awaiting; a rejected push and a settled non-invalid decline
              // are logged (destination errors are DLQ'd inside the
              // collector). A 2xx means "accepted", not "delivered".
              respondGif();
              settleAfterAck(env.push(parsedData), env.logger);
            } else {
              // Synchronous: await the push so a step (e.g. a cache/asset
              // destination) can respond with real content before the GIF
              // fallback applies.
              await env.push(parsedData);
              respondGif();
            }
          } else {
            respondGif();
          }
          return;
        }

        // Handle POST requests (standard event ingestion)
        if (req.method === 'POST') {
          const eventData =
            req.body && typeof req.body === 'object' ? req.body : {};

          if (respondFirst) {
            // Respond-first ("accepted"), then deliver asynchronously. A
            // rejected push and a settled non-invalid decline are logged, not
            // surfaced to the client and not left unhandled (destination
            // errors are DLQ'd inside the collector).
            respond({ body: { success: true, timestamp: Date.now() } });
            settleAfterAck(env.push(eventData), env.logger);
          } else {
            // Synchronous ack: wait for delivery to settle before responding,
            // and reflect the outcome. Invalid input is the client's fault
            // (400 with the reason); anything else that failed is ours (500).
            const result = await env.push(eventData);
            if (result?.ok === false) {
              const invalid = result.invalid === true;
              respond({
                status: invalid ? 400 : 500,
                body: {
                  success: false,
                  error:
                    result.error ??
                    (invalid ? 'Invalid event' : 'Event was not processed'),
                  timestamp: Date.now(),
                },
              });
            } else {
              respond({ body: { success: true, timestamp: Date.now() } });
            }
          }
          return;
        }

        // Unsupported method
        res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST, GET, or OPTIONS.',
        });
      });
    } catch (error) {
      // The reason is logged, not returned: an unexpected fault's message can
      // carry paths, dependency names or config details, and the caller can do
      // nothing with it. Matches the error-boundary middleware's answer for the
      // same class of fault.
      env.logger.error(toError(error));
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
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
    if (route.methods.includes('POST')) app.post(route.path, jsonParser, push);
    if (route.methods.includes('GET')) app.get(route.path, push);
    app.options(route.path, push); // Always register OPTIONS for CORS
  }

  // Error boundary for the middleware chain. Client-caused body errors are
  // expected ambient noise on a public endpoint: answer deliberately, count,
  // and keep them out of the error channel. Anything else is a real fault
  // and stays loud.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      // The response is already on the wire, so this fault cannot be
      // answered. Give it a structured home before re-raising; express
      // needs the re-raise to destroy the socket.
      env.logger.error(toError(err));
      return next(err);
    }
    if (isRequestBodyError(err)) {
      countRejected();
      env.logger.debug('Request body rejected', {
        status: err.status,
        type: err.type,
        error: err.message,
        sample:
          typeof err.body === 'string' ? err.body.slice(0, 200) : undefined,
      });
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    env.logger.error(toError(err));
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // Source owns the HTTP server (if port configured)
  let server: ReturnType<typeof app.listen> | undefined;

  if (settings.port !== undefined) {
    server = app.listen(settings.port, () => {
      const routeLines = resolvedPaths
        .map((r) => {
          const methods = [...r.methods, 'OPTIONS'].join(', ');
          return `   ${methods} ${r.path}`;
        })
        .join('\n');
      env.logger.info(
        `Express source listening on port ${settings.port}\n` + routeLines,
      );
    });
  }

  const instance: ExpressSource = {
    type: 'express',
    config: {
      ...config,
      settings,
    },
    push,
    httpHandler: app,
    app,
    server,
    destroy: (_context) =>
      new Promise<void>((resolve, reject) => {
        if (!server) return resolve();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
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
