import { requestToData, isObject, isDefined } from '@walkeros/core';
import type { WalkerOS, Collector, Source } from '@walkeros/core';
import type { FetchSource, Types } from './types';
import { SettingsSchema, EventSchema } from './schemas';
import {
  createCorsHeaders,
  createPixelResponse,
  createJsonResponse,
  matchPath,
} from './utils';

export const sourceFetch: Source.Init<Types> = async (context) => {
  const { config = {}, env, setIngest } = context;
  const settings = SettingsSchema.parse(config.settings || {});
  const { logger } = env;

  const push = async (request: Request): Promise<Response> => {
    const startTime = Date.now();

    try {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const origin = request.headers.get('Origin');
      const corsHeaders = createCorsHeaders(settings.cors, origin);

      // Health check (no logging - routine operation)
      if (settings.healthPath && url.pathname === settings.healthPath) {
        return createJsonResponse(
          { status: 'ok', timestamp: Date.now(), source: 'fetch' },
          200,
          corsHeaders,
        );
      }

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

      // Extract ingest metadata from request (if config.ingest is defined)
      await setIngest(request);

      // GET (pixel tracking - no logging, routine)
      if (method === 'GET') {
        const parsedData = requestToData(url.search);
        if (parsedData && isObject(parsedData)) {
          await env.push(parsedData);
        }
        return createPixelResponse(corsHeaders);
      }

      // POST
      if (method === 'POST') {
        // Check request size
        const contentLength = request.headers.get('Content-Length');
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > settings.maxRequestSize) {
            logger.error('Request too large', {
              size,
              limit: settings.maxRequestSize,
            });
            return createJsonResponse(
              {
                success: false,
                error: `Request too large. Maximum size: ${settings.maxRequestSize} bytes`,
              },
              413,
              corsHeaders,
            );
          }
        }

        let eventData: unknown;
        let bodyText: string;

        try {
          bodyText = await request.text();

          // Check actual body size
          if (bodyText.length > settings.maxRequestSize) {
            logger.error('Request body too large', {
              size: bodyText.length,
              limit: settings.maxRequestSize,
            });
            return createJsonResponse(
              {
                success: false,
                error: `Request too large. Maximum size: ${settings.maxRequestSize} bytes`,
              },
              413,
              corsHeaders,
            );
          }

          eventData = JSON.parse(bodyText);
        } catch (error) {
          logger.error('Failed to parse JSON', error);
          return createJsonResponse(
            { success: false, error: 'Invalid JSON body' },
            400,
            corsHeaders,
          );
        }

        if (!isDefined(eventData) || !isObject(eventData)) {
          logger.error('Invalid event body type');
          return createJsonResponse(
            { success: false, error: 'Invalid event: body must be an object' },
            400,
            corsHeaders,
          );
        }

        // Check for batch
        const isBatch = 'batch' in eventData && Array.isArray(eventData.batch);

        if (isBatch) {
          const batch = eventData.batch as unknown[];

          if (batch.length > settings.maxBatchSize) {
            logger.error('Batch too large', {
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

          const results = await processBatch(batch, env.push, logger);

          if (results.failed > 0) {
            return createJsonResponse(
              {
                success: false,
                processed: results.successful,
                failed: results.failed,
                errors: results.errors,
              },
              207,
              corsHeaders,
            );
          }

          return createJsonResponse(
            {
              success: true,
              processed: results.successful,
              ids: results.ids,
            },
            200,
            corsHeaders,
          );
        }

        // Single event - validate
        const validation = EventSchema.safeParse(eventData);
        if (!validation.success) {
          const errors = validation.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }));

          logger.error('Event validation failed', { errors });

          return createJsonResponse(
            {
              success: false,
              error: 'Event validation failed',
              validationErrors: errors,
            },
            400,
            corsHeaders,
          );
        }

        const result = await processEvent(
          validation.data as WalkerOS.DeepPartialEvent,
          env.push,
        );
        if (result.error) {
          logger.error('Event processing failed', { error: result.error });
          return createJsonResponse(
            { success: false, error: result.error },
            400,
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
): Promise<{ id?: string; error?: string }> {
  try {
    const result = await push(event);
    return { id: result?.event?.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processBatch(
  events: unknown[],
  push: Collector.PushFn,
  logger: Types['env']['logger'],
): Promise<{
  successful: number;
  failed: number;
  ids: string[];
  errors: Array<{ index: number; error: string }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    ids: [] as string[],
    errors: [] as Array<{ index: number; error: string }>,
  };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    const validation = EventSchema.safeParse(event);
    if (!validation.success) {
      results.failed++;
      results.errors.push({
        index: i,
        error: `Validation failed: ${validation.error.issues[0].message}`,
      });
      logger.error(`Batch event ${i} validation failed`, {
        errors: validation.error.issues,
      });
      continue;
    }

    try {
      const result = await push(validation.data as WalkerOS.DeepPartialEvent);
      if (result?.event?.id) {
        results.ids.push(result.event.id);
      }
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.error(`Batch event ${i} processing failed`, error);
    }
  }

  return results;
}

export type * from './types';
export * as SourceFetch from './types';
export * from './utils';
export * as schemas from './schemas';
export * as examples from './examples';

export default sourceFetch;
