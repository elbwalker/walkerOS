import type { LambdaSource, Env, Settings, EventRequest, Types } from './types';
import type { Source } from '@walkeros/core';
import { requestToData } from '@walkeros/core';
import {
  parseEvent,
  parseBody,
  isEventRequest,
  getCorsHeaders,
  createResponse,
  createPixelResponse,
  getPath,
} from './utils';
import { processEvent } from './push';
import { SettingsSchema } from './schemas/settings';

export * as SourceLambda from './types';
export * as schemas from './schemas';

// Export examples
export * as examples from './examples';

export const sourceLambda = async (
  config: Partial<Source.Config<Types>> = {},
  env: Env,
): Promise<LambdaSource> => {
  const { push: envPush } = env;

  const settings = SettingsSchema.parse(config.settings || {});

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings,
  };

  const push: Types['push'] = async (event, context) => {
    const requestId = context.awsRequestId;
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

      // Handle GET for pixel tracking
      if (parsed.method === 'GET') {
        if (!settings.enablePixelTracking) {
          return createResponse(
            405,
            { success: false, error: 'GET not allowed', requestId },
            corsHeaders,
            requestId,
          );
        }
        if (parsed.queryString) {
          const parsedData = requestToData(parsed.queryString);
          if (parsedData && typeof parsedData === 'object') {
            await envPush(parsedData);
          }
        }
        return createPixelResponse(corsHeaders, requestId);
      }

      // Handle POST for event data
      if (parsed.method === 'POST') {
        if (!parsed.body) {
          return createResponse(
            400,
            { success: false, error: 'Request body is required', requestId },
            corsHeaders,
            requestId,
          );
        }

        const body = parseBody(parsed.body, parsed.isBase64Encoded);

        if (!body || typeof body !== 'object') {
          return createResponse(
            400,
            { success: false, error: 'Invalid event body', requestId },
            corsHeaders,
            requestId,
          );
        }

        if (isEventRequest(body)) {
          const result = await processEvent(
            body as EventRequest,
            envPush,
            env.logger,
            requestId,
          );

          if (result.error) {
            return createResponse(
              400,
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
          400,
          { success: false, error: 'Invalid request format', requestId },
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
