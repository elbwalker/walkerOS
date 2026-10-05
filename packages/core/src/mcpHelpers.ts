import { isArray, isObject } from './is';

/**
 * The body of a tool result. MCP requires `structuredContent` to be a JSON
 * object, so a plain object passes as it is, an array is answered as
 * `{ items }` and any other value as `{ value }` (`undefined` as `null`,
 * which JSON can carry).
 */
function resultBody(result: unknown): Record<string, unknown> {
  if (isObject(result)) return result;
  if (isArray(result)) return { items: result };
  return { value: result ?? null };
}

/**
 * A successful MCP tool result. `structuredContent` is always an object and
 * the text block is the same object serialized, so a client reading either
 * one sees the same answer. Hints are attached as `_hints`.
 */
export function mcpResult(
  result: unknown,
  hints?: { next?: string[]; warnings?: string[] },
) {
  const body = resultBody(result);
  const structured: Record<string, unknown> = hints
    ? { ...body, _hints: hints }
    : body;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(structured, null, 2),
      },
    ],
    structuredContent: structured,
  };
}

export function mcpError(error: unknown, hint?: string) {
  let message: string;
  let path: string | undefined;
  let code: string | undefined;
  let details: unknown[] | undefined;

  if (error instanceof Error) {
    message = error.message;
    // Detect ApiError (has code and/or details properties)
    const err = error as Error & { code?: string; details?: unknown[] };
    if (err.code) code = err.code;
    if (Array.isArray(err.details)) details = err.details;
  } else if (typeof error === 'string') {
    message = error;
  } else if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    const issues = (
      error as { issues: Array<{ path?: unknown[]; message: string }> }
    ).issues;
    message = issues.map((i) => i.message).join('; ');
    path = issues[0]?.path?.join('.') || undefined;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  } else {
    message = 'Unknown error';
  }

  const structured: Record<string, unknown> = { error: message };
  if (hint) structured.hint = hint;
  if (path) structured.path = path;
  if (code) structured.code = code;
  if (details) structured.details = details;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(structured),
      },
    ],
    structuredContent: structured,
    isError: true as const,
  };
}
