import type {
  CloudFunctionSource,
  Settings,
  EventResponse,
  Request,
  Response,
  Types,
} from './types';
import type { Source } from '@walkeros/core';
import { isEventRequest, setCorsHeaders } from './utils';
import { processEvent } from './push';

export * as SourceCloudFunction from './types';

const DEFAULT_SETTINGS: Settings = {
  cors: true,
  timeout: 30000,
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
      await context.withScope(req, undefined, async (scopeEnv) => {
        const envPush = scopeEnv.push;

        if (req.method !== 'POST') {
          res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.',
          });
          return;
        }

        // navigator.sendBeacon forces Content-Type: text/plain;charset=UTF-8 even
        // for JSON payloads. Functions Framework parses text/plain bodies as
        // strings, so attempt JSON.parse before falling through to the empty-event
        // branch. Mirrors the AWS Lambda parseBody() pattern.
        let body: unknown = req.body;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            // Leave as string; falls through to empty-event branch below.
          }
        }

        if (isEventRequest(body)) {
          const result = await processEvent(body, envPush);

          if (result.error) {
            res.status(result.status ?? 500).json({
              success: false,
              error: result.error,
            } as EventResponse);
          } else {
            res.status(200).json({
              success: true,
              id: result.id,
            } as EventResponse);
          }
        } else {
          // Push empty event for non-event bodies (enables source.before transformers to process raw input)
          const result = await envPush({});

          if (result?.ok === false) {
            const invalid = result.invalid === true;
            res.status(invalid ? 400 : 500).json({
              success: false,
              error:
                result.error ??
                (invalid ? 'Invalid event' : 'Event was not processed'),
            } as EventResponse);
            return;
          }

          res.status(200).json({
            success: true,
            id: result?.event?.id,
          } as EventResponse);
        }
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
