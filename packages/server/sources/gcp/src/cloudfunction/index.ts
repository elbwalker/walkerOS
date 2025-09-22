import type {
  Environment,
  CloudFunctionSource,
  Settings,
  EventResponse,
  RequestBody,
  Request,
  Response,
  Mapping,
} from './types';
import type { Source } from '@walkeros/core';
import { isEventRequest, setCorsHeaders } from './utils';
import { processEvent } from './push';

export * as SourceCloudFunction from './types';

const DEFAULT_SETTINGS: Settings = {
  cors: true,
  timeout: 30000,
};

export const sourceCloudFunction = async (
  config: Partial<Source.Config<Settings, Mapping>> = {},
  env: Environment,
): Promise<CloudFunctionSource> => {
  const { elb } = env;

  if (!elb) {
    throw new Error(
      'Cloud Function source requires elb function in environment',
    );
  }

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(config.settings || {}),
  };

  const fullConfig: Source.Config<Settings, Mapping> = {
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
        const result = await processEvent(body, elb);

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
