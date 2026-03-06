export function mcpResult(result: unknown, summary?: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: summary ?? JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result as Record<string, unknown>,
  };
}

export function mcpError(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true as const,
  };
}
