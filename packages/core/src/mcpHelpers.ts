export function mcpResult(
  result: unknown,
  summary?: string,
  hints?: { next?: string[]; warnings?: string[] },
) {
  const enriched = hints
    ? { ...(result as Record<string, unknown>), _hints: hints }
    : result;
  return {
    content: [
      {
        type: 'text' as const,
        text: summary ?? JSON.stringify(enriched, null, 2),
      },
    ],
    structuredContent: enriched as Record<string, unknown>,
  };
}

export function mcpError(error: unknown, hint?: string) {
  let message: string;
  let path: string | undefined;

  if (error instanceof Error) {
    message = error.message;
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
