import type {
  CloudFunctionSource,
  Settings,
  EventResponse,
  Request,
  Response,
  Types,
} from './types';
import type { Source } from '@walkeros/core';
import {
  batchResponse,
  isBatchBody,
  requestToData,
  toEventList,
} from '@walkeros/core';
import { setCorsHeaders, TRANSPARENT_GIF } from './utils';
import { processEvent } from './push';
import { buildScope } from './scope';

export * as SourceCloudFunction from './types';

const DEFAULT_SETTINGS: Settings = {
  cors: true,
  timeout: 30000,
  maxBatchSize: 100,
  enablePixelTracking: true,
};

export const sourceCloudFunction: Source.Init<Types> = async (context) => {
  const { config = {} } = context;

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(config.settings || {}),
  };

  const fullConfig: Source.Config<Types> = {
    ...config,
    settings,
  };

  const push = async (req: Request, res: Response): Promise<void> => {
    try {
      setCorsHeaders(res, settings.cors || false);

      if (req.method === 'OPTIONS') {
        res.status(204).send();
        return;
      }

      // Per-invocation scope: each request gets its own ingest. Cloud
      // Function returns the response directly via res, not via async
      // respond, so no respond fn is wired here.
      const scope = buildScope(req);

      await context.withScope(scope, undefined, async (scopeEnv) => {
        const envPush = scopeEnv.push;

        // GET serves the tracking pixel: query parameters carry exactly one
        // event, which is the no-JS path.
        if (req.method === 'GET') {
          if (!settings.enablePixelTracking) {
            res.status(405).json({
              success: false,
              error: 'Method not allowed. Use POST.',
            });
            return;
          }

          const parsedData = requestToData(scope.url || req.originalUrl || '');
          if (parsedData && typeof parsedData === 'object') {
            await envPush(parsedData);
          }

          res
            .status(200)
            .set('Content-Type', 'image/gif')
            .set('Cache-Control', 'no-cache, no-store, must-revalidate')
            .send(TRANSPARENT_GIF);
          return;
        }

        if (req.method !== 'POST') {
          res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.',
          });
          return;
        }

        // The body was parsed once when the scope was built, so ingest.body and
        // the event the pipeline receives are the same value.
        const events = toEventList(scope.body);
        const batched = isBatchBody(scope.body);

        if (batched && events.length > (settings.maxBatchSize ?? 100)) {
          res.status(400).json({
            success: false,
            error: `Batch too large. Maximum size: ${settings.maxBatchSize} events`,
          } as EventResponse);
          return;
        }

        const results = [];
        for (const event of events) {
          results.push(await processEvent(event, envPush));
        }

        if (batched) {
          const { status, body } = batchResponse(results);
          res.status(status).json(body);
          return;
        }

        const result = results[0];
        if (result.error) {
          res.status(result.status ?? 500).json({
            success: false,
            error: result.error,
          } as EventResponse);
          return;
        }

        res.status(200).json({
          success: true,
          id: result.id,
        } as EventResponse);
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  return {
    type: 'cloudfunction',
    config: fullConfig,
    push,
  };
};

export default sourceCloudFunction;
