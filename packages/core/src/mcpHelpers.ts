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
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message, ...(hint ? { hint } : {}) }),
      },
    ],
    isError: true as const,
  };
}
