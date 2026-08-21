import {
  normalizeBody,
  requestToData,
  isObject,
  toEventList,
  isBatchBody,
  batchResponse,
  pushResultToOutcome,
} from '@walkeros/core';
import type {
  WalkerOS,
  Collector,
  Logger,
  Source,
  EventOutcome,
} from '@walkeros/core';
import type { FetchSource, Types } from './types';
import {
  createCorsHeaders,
  createPixelResponse,
  createJsonResponse,
  matchPath,
} from './utils';
import { buildScope } from './scope';

export const sourceFetch: Source.Init<Types> = async (context) => {
  const { config = {}, env } = context;
  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    cors: userSettings.cors ?? true,
    maxRequestSize: userSettings.maxRequestSize ?? 102400,
    maxBatchSize: userSettings.maxBatchSize ?? 100,
    paths:
      userSettings.paths ??
      (userSettings.path ? [userSettings.path] : ['/collect']),
  };
  const { logger } = env;

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

  const push = async (request: Request): Promise<Response> => {
    const startTime = Date.now();
    void startTime;

    try {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const origin = request.headers.get('Origin');
      const corsHeaders = createCorsHeaders(settings.cors, origin);

      // Resolve route configs
      const resolvedPaths = settings.paths.map((entry) =>
        typeof entry === 'string'
          ? { path: entry, methods: ['GET', 'POST'] as const }
          : {
              path: entry.path,
              methods: entry.methods || (['GET', 'POST'] as const),
            },
      );

      // Match request path against configured routes
      const matchedRoute = resolvedPaths.find((route) =>
        matchPath(url.pathname, route.path),
      );

      if (!matchedRoute) {
        return createJsonResponse(
          { success: false, error: 'Not found' },
          404,
          corsHeaders,
        );
      }

      // OPTIONS (CORS preflight - no logging, routine)
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Check method is allowed for this route
      if (!matchedRoute.methods.includes(method as 'GET' | 'POST')) {
        return createJsonResponse(
          { success: false, error: 'Method not allowed' },
          405,
          corsHeaders,
        );
      }

      // Per-request scope: each fetch invocation gets its own ingest.
      // Fetch sources return a Response directly, not via async respond.
      // Size guards run before the scope is built, and in this order: the
      // declared length is checked first so an oversized request is rejected
      // without ever reading its body.
      const tooLarge = () => {
        countRejected();
        return createJsonResponse(
          {
            success: false,
            error: `Request too large. Maximum size: ${settings.maxRequestSize} bytes`,
          },
          413,
          corsHeaders,
        );
      };

      let parsedBody: unknown;

      if (method === 'POST') {
        const contentLength = request.headers.get('Content-Length');
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > settings.maxRequestSize) {
            logger.debug('Request too large', {
              size,
              limit: settings.maxRequestSize,
            });
            return tooLarge();
          }
        }

        const bodyText = await request.text();
        // The limit is in bytes, and String.length counts UTF-16 code units,
        // so a non-ASCII body would otherwise pass a limit it exceeds.
        const bodySize = new TextEncoder().encode(bodyText).byteLength;

        if (bodySize > settings.maxRequestSize) {
          logger.debug('Request body too large', {
            size: bodySize,
            limit: settings.maxRequestSize,
          });
          return tooLarge();
        }

        // A body that does not parse to an object is raw input: toEventList
        // yields a single empty event and ingest.body carries the value for a
        // source.before chain to decode.
        parsedBody = normalizeBody(bodyText);
      }

      const scope = buildScope(
        request,
        method === 'POST' ? parsedBody : undefined,
      );

      return await context.withScope(scope, undefined, async (scopeEnv) => {
        const envPush = scopeEnv.push;

        // GET (pixel tracking - no logging, routine)
        if (method === 'GET') {
          const parsedData = requestToData(url.search);
          if (parsedData && isObject(parsedData)) {
            await envPush(parsedData);
          }
          return createPixelResponse(corsHeaders);
        }

        // POST
        if (method === 'POST') {
          const events = toEventList(parsedBody);
          // Dispatch on the envelope FORM, not the event count: a one element
          // batch is still a batch and keeps the batch response shape.
          const batched = isBatchBody(parsedBody);

          if (batched) {
            const batch = events;

            if (batch.length > settings.maxBatchSize) {
              countRejected();
              logger.debug('Batch too large', {
                size: batch.length,
                limit: settings.maxBatchSize,
              });
              return createJsonResponse(
                {
                  success: false,
                  error: `Batch too large. Maximum size: ${settings.maxBatchSize} events`,
                },
                400,
                corsHeaders,
              );
            }

            const outcomes = await processBatch(batch, envPush, logger);
            const { status, body } = batchResponse(outcomes);

            return createJsonResponse(body, status, corsHeaders);
          }

          // Forward event directly — validation is not the source's responsibility.
          const result = await processEvent(events[0] ?? {}, envPush, logger);
          if (result.error) {
            // A thrown push is already error-logged inside processEvent;
            // this covers settled declines only.
            logger.warn('Event processing failed', { error: result.error });
            return createJsonResponse(
              { success: false, error: result.error },
              result.status ?? 500,
              corsHeaders,
            );
          }

          return createJsonResponse(
            { success: true, id: result.id, timestamp: Date.now() },
            200,
            corsHeaders,
          );
        }

        return createJsonResponse(
          { success: false, error: 'Method not allowed' },
          405,
          corsHeaders,
        );
      });
    } catch (error) {
      logger.error('Internal server error', error);
      const corsHeaders = createCorsHeaders(settings.cors);
      return createJsonResponse(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        500,
        corsHeaders,
      );
    }
  };

  return { type: 'fetch', config: { ...config, settings }, push };
};

async function processEvent(
  event: WalkerOS.DeepPartialEvent,
  push: Collector.PushFn,
  logger: Logger.Instance,
): Promise<{ id?: string; error?: string; status?: number }> {
  try {
    const result = await push(event);
    if (result?.ok === false) {
      if (result.invalid === true) {
        return { error: result.error ?? 'Invalid event', status: 400 };
      }
      return {
        error: result.error ?? 'Event was not processed',
        status: 500,
      };
    }
    return { id: result?.event?.id };
  } catch (error) {
    // A rejected push promise is a server fault: the collector resolves
    // pipeline failures, so a rejection is exceptional by construction.
    // Logged here at error because the call site cannot distinguish a
    // settled ok:false from a rejection, and a rejected push has to stay
    // in the error channel.
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Event processing failed', { error: message });
    return { error: message, status: 500 };
  }
}

async function processBatch(
  events: unknown[],
  push: Collector.PushFn,
  logger: Types['env']['logger'],
): Promise<EventOutcome[]> {
  const outcomes: EventOutcome[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    try {
      const result = await push(event as WalkerOS.DeepPartialEvent);
      const outcome = pushResultToOutcome(result ?? {});
      if (outcome.error) logger.warn(`Batch event ${i} not processed`);
      outcomes.push(outcome);
    } catch (error) {
      outcomes.push({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.warn(`Batch event ${i} processing failed`, error);
    }
  }

  return outcomes;
}

export type * from './types';
export * as SourceFetch from './types';
export * from './utils';

export default sourceFetch;
