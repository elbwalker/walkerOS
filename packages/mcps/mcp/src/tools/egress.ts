import type { PushResult } from '@walkeros/cli';
import { isObject, mcpError, mcpResult } from '@walkeros/core';
import { scrubJson, scrubSecrets } from '@walkeros/core/node';
import type { FlowRuntime } from '../runtime/types.js';

/**
 * Simulate and push results carry recorded vendor calls, network requests and
 * vendor responses whose values can hold credentials. They egress like a log
 * line: `scrubJson` (masking the values of the secrets the flow references,
 * `known`, and credential patterns), then parse back into the structured
 * result.
 */
export function scrubbed(
  result: Record<string, unknown>,
  known: readonly string[],
): Record<string, unknown> {
  const parsed = parseObject(scrubJson(result, { known }));
  if (!parsed) throw new Error('Result could not be redacted as JSON.');
  return parsed;
}

/** An error response as built by `mcpError`; a stub may lack the structured copy. */
type ErrorResponse = Omit<ReturnType<typeof mcpError>, 'structuredContent'> & {
  structuredContent?: Record<string, unknown>;
};

/**
 * The error response egresses the same way: its structured copy is scrubbed,
 * and the text is that copy serialized (as `mcpError` builds it), so it stays
 * valid JSON. Without a structured copy that scrubs, each text part is
 * scrubbed as a line instead, so the error message is never lost.
 */
export function scrubbedError(
  response: ErrorResponse,
  known: readonly string[],
): ReturnType<typeof mcpError> {
  let structuredContent: Record<string, unknown> | undefined;
  try {
    if (response.structuredContent)
      structuredContent = scrubbed(response.structuredContent, known);
  } catch {
    structuredContent = undefined;
  }
  if (structuredContent) {
    return {
      ...response,
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent,
    };
  }
  return {
    ...response,
    content: response.content.map((part) => ({
      ...part,
      text: scrubSecrets(part.text, { known }),
    })),
    structuredContent: { error: 'The error could not be redacted.' },
  };
}

/**
 * A push result as it egresses: scrubbed and parsed back. `success` and
 * `duration` come from the CLI, never from a vendor, and stay as they are so
 * the output schema always holds. A push already happened, so this never
 * throws: if the scrubbed text does not parse, the text alone carries the
 * result and the structured copy keeps the scalars.
 */
export function scrubbedPushResult(
  result: PushResult,
  known: readonly string[],
): ReturnType<typeof mcpResult> {
  const text = scrubJson(result, { known, space: 2 });
  const parsed = parseObject(text);
  if (parsed)
    return mcpResult({
      ...parsed,
      success: result.success,
      duration: result.duration,
    });
  return {
    content: [{ type: 'text', text }],
    structuredContent: { success: result.success, duration: result.duration },
  };
}

/** The flow's secret values; none when the runtime cannot read the config. */
export async function knownSecretsOf(
  runtime: FlowRuntime,
  input: string,
): Promise<string[]> {
  if (!runtime.knownSecrets) return [];
  try {
    return await runtime.knownSecrets(input);
  } catch {
    return [];
  }
}

function parseObject(text: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
