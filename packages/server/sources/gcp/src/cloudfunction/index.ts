import type {
  CloudFunctionSource,
  Settings,
  EventResponse,
  RequestBody,
  Request,
  Response,
  Types,
} from './types';
import type { Source } from '@walkeros/core';
import { isEventRequest, setCorsHeaders } from './utils';
import { processEvent } from './push';

export * as SourceCloudFunction from './types';
export * as schemas from './schemas';

// Export examples
export * as examples from './examples';

const DEFAULT_SETTINGS: Settings = {
  cors: true,
  timeout: 30000,
};

export const sourceCloudFunction: Source.Init<Types> = async (context) => {
  const { config = {}, env, setIngest } = context;
  const { push: envPush } = env;

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

      // Extract ingest metadata from request (if config.ingest is defined)
      await setIngest(req);

      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.',
        });
        return;
      }

      if (!req.body) {
        res.status(400).json({
          success: false,
          error: 'Request body is required',
        });
        return;
      }

      const body = req.body as RequestBody;

      if (isEventRequest(body)) {
        const result = await processEvent(body, envPush);

        if (result.error) {
          res.status(400).json({
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
        res.status(400).json({
          success: false,
          error: 'Invalid request format. Expected event object.',
        });
      }
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
