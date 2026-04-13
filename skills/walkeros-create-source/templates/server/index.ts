import type { Source } from '@walkeros/core';
import type { Config, Input, Settings } from './types';

export * as SourceName from './types';
// Note: schemas belong in ./dev (separate subpath export), never in the
// main runtime entry — otherwise zod gets pulled into production bundles.
export * as examples from '../../examples';

/**
 * Server source template using context pattern.
 *
 * Key patterns:
 * 1. Context destructuring - extract config, env, logger, id from context
 * 2. Apply defaults inline - flow.json is developer-controlled
 * 3. Forward to collector - call env.push() to send events
 * 4. Error logging - use logger?.error() for errors only
 * 5. Return Source.Instance - return { type, config, push } object
 */
export const sourceMySource: Source.Init<{
  settings: Settings;
  push: (request: Request) => Promise<Response>;
  env: Source.Env;
}> = async (context) => {
  // Destructure what you need from context
  const { config = {}, env } = context;
  const { push: envPush, logger } = env;

  // Apply defaults inline — flow.json is developer-controlled, so no
  // runtime validation. Shape checks live in ./schemas and are used by
  // `walkeros validate` and dev tooling, never at runtime.
  const userSettings = config.settings || {};
  const settings: Settings = {
    validateSignature: userSettings.validateSignature ?? false,
    apiKeyHeader: userSettings.apiKeyHeader ?? 'x-api-key',
  };

  const fullConfig: Source.Config<{ settings: Settings }> = {
    ...config,
    settings,
  };

  /**
   * Push handler - receives incoming data and forwards to collector.
   * The signature varies by source type (HTTP handler, DOM handler, etc.)
   */
  const push = async (request: Request): Promise<Response> => {
    try {
      const body = await parseRequestBody(request);

      if (!isValidInput(body)) {
        return createErrorResponse(400, 'Invalid input format');
      }

      // Transform to walkerOS event format
      const eventData = transformInput(body);

      // Forward to collector via env.push
      await envPush(eventData);

      return createSuccessResponse();
    } catch (error) {
      // Log errors per using-logger skill (only errors, not routine ops)
      logger?.error('Source processing error', { error });
      return createErrorResponse(500, 'Processing failed');
    }
  };

  return {
    type: 'my-source',
    config: fullConfig,
    push,
  };
};

/**
 * Parse request body from incoming HTTP request.
 */
async function parseRequestBody(request: Request): Promise<unknown> {
  const text = await request.text();
  return JSON.parse(text);
}

/**
 * Validate input has required fields.
 */
function isValidInput(body: unknown): body is Input {
  return (
    typeof body === 'object' &&
    body !== null &&
    'event' in body &&
    typeof (body as Input).event === 'string'
  );
}

/**
 * Transform incoming input to walkerOS event format.
 * Event renaming is handled by the mapping system, not here.
 */
function transformInput(input: Input) {
  return {
    name: input.event,
    data: input.properties ?? {},
    user: input.userId ? { id: input.userId } : undefined,
  };
}

function createSuccessResponse(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function createErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default sourceMySource;
