import type { LambdaSource, Types } from './types';
import type { Source } from '@walkeros/core';
import {
  batchResponse,
  isBatchBody,
  requestToData,
  toEventList,
} from '@walkeros/core';
import {
  parseEvent,
  getCorsHeaders,
  createResponse,
  createPixelResponse,
  getPath,
} from './utils';
import { processEvent } from './push';
import { buildScope } from './scope';

export * as SourceLambda from './types';

export const sourceLambda: Source.Init<Types> = async (context) => {
  const { config = {}, env } = context;

  const userSettings = config.settings || {};
  const settings = {
    ...userSettings,
    cors: userSettings.cors ?? true,
    timeout: userSettings.timeout ?? 30000,
    enablePixelTracking: userSettings.enablePixelTracking ?? true,
    healthPath: userSettings.healthPath ?? '/health',
    maxBatchSize: userSettings.maxBatchSize ?? 100,
  };

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings,
  };

  const push: Types['push'] = async (event, lambdaContext) => {
    const requestId = lambdaContext.awsRequestId;
    let parsed;

    try {
      const corsHeaders = getCorsHeaders(settings.cors || false);
      parsed = parseEvent(event);
      const path = getPath(event);

      // Health check
      if (settings.healthPath && path === settings.healthPath) {
        return createResponse(
          200,
          {
            status: 'ok',
            timestamp: Date.now(),
            source: 'lambda',
            requestId,
          },
          corsHeaders,
          requestId,
        );
      }

      // Handle OPTIONS for CORS preflight
      if (parsed.method === 'OPTIONS') {
        return createResponse(204, '', corsHeaders, requestId);
      }

      // Per-invocation scope: each Lambda invocation gets its own ingest.
      // No respond fn — Lambda returns the response directly from this
      // handler, not via async respond.
      const scope = buildScope(event);

      return await context.withScope(scope, undefined, async (scopeEnv) => {
        const envPush = scopeEnv.push;

        // Handle GET for pixel tracking
        if (parsed!.method === 'GET') {
          if (!settings.enablePixelTracking) {
            return createResponse(
              405,
              { success: false, error: 'GET not allowed', requestId },
              corsHeaders,
              requestId,
            );
          }
          if (parsed!.queryString) {
            const parsedData = requestToData(parsed!.queryString);
            if (parsedData && typeof parsedData === 'object') {
              await envPush(parsedData);
            }
          }
          return createPixelResponse(corsHeaders, requestId);
        }

        // Handle POST for event data
        if (parsed!.method === 'POST') {
          if (!parsed!.body) {
            return createResponse(
              400,
              { success: false, error: 'Request body is required', requestId },
              corsHeaders,
              requestId,
            );
          }

          // Parsed once when the scope was built, so ingest.body and the event
          // the pipeline receives are the same value.
          const events = toEventList(scope.body);
          const batched = isBatchBody(scope.body);
          const maxBatchSize = settings.maxBatchSize ?? 100;

          if (batched && events.length > maxBatchSize) {
            return createResponse(
              400,
              {
                success: false,
                error: `Batch too large. Maximum size: ${maxBatchSize} events`,
                requestId,
              },
              corsHeaders,
              requestId,
            );
          }

          const results = [];
          for (const event of events) {
            results.push(
              await processEvent(event, envPush, env.logger, requestId),
            );
          }

          if (batched) {
            const { status, body } = batchResponse(results);
            return createResponse(
              status,
              { ...body, requestId },
              corsHeaders,
              requestId,
            );
          }

          const result = results[0];
          if (result.error) {
            return createResponse(
              result.status ?? 500,
              { success: false, error: result.error, requestId },
              corsHeaders,
              requestId,
            );
          }

          return createResponse(
            200,
            { success: true, id: result.id, requestId },
            corsHeaders,
            requestId,
          );
        }

        return createResponse(
          405,
          { success: false, error: 'Method not allowed', requestId },
          corsHeaders,
          requestId,
        );
      });
    } catch (error) {
      // Log handler errors with context - per using-logger skill
      env.logger?.error('Lambda handler error', {
        error,
        requestId,
        method: parsed?.method,
      });
      return createResponse(
        500,
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Internal server error',
          requestId,
        },
        {},
        requestId,
      );
    }
  };

  return {
    type: 'lambda',
    config: fullConfig,
    push,
  };
};

export default sourceLambda;
