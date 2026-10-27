import type { Source, WalkerOS } from '@walkeros/core';
import { isObject, pushResultToOutcome } from '@walkeros/core';
import type { Input, Push, Settings, Types } from './types';

export * as SourceMySource from './types';
// Examples and schemas live on the ./dev subpath (dev.ts), never in this
// runtime entry, so zod and test data stay out of production bundles.

/**
 * Server source template (an HTTP handler that turns a platform's webhook
 * body into walkerOS events).
 *
 * Key patterns:
 * 1. Context destructuring: config and env from the context
 * 2. Defaults inline: ./schemas describes the settings for `walkeros
 *    validate` and walkerOS.json; nothing parses them at runtime
 * 3. Forward to the collector with env.push and answer the producer from its
 *    result: pushResultToOutcome gives 200, 400 (invalid input) or 500 (a
 *    retryable failure)
 * 4. Input the source cannot read is a 400; the collector reports every other
 *    failure, so the source logs none itself
 * 5. Return Source.Instance: { type, config, push }
 */
export const sourceMySource: Source.Init<Types> = async (context) => {
  const { config = {}, env } = context;

  // Apply defaults inline (this template has no settings)
  const settings: Settings = { ...config.settings };

  const push: Push = async (request) => {
    const body = await readJson(request);
    if (!isInput(body)) return json(400, { error: 'Invalid input format' });

    const outcome = pushResultToOutcome(await env.push(toEvent(body)));
    return json(outcome.status ?? 200, outcome);
  };

  return {
    type: 'my-source',
    config: { ...config, settings },
    push,
  };
};

/** The request body as JSON, or undefined when it is none. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Whether a body is the platform's input format. */
function isInput(body: unknown): body is Input {
  return isObject(body) && typeof body.event === 'string';
}

/**
 * The platform's input as a walkerOS event. A source mapping renames the
 * event (`page_view` to `page view`).
 */
function toEvent(input: Input): WalkerOS.DeepPartialEvent {
  return {
    name: input.event,
    data: input.properties ?? {},
    ...(input.userId ? { user: { id: input.userId } } : {}),
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default sourceMySource;
