// Shared types for MCP management tools.
// Keep this file dependency-light: only type-level imports from SDK/core.

/**
 * Discriminated input shape for action-based MCP tools.
 * Example: ActionToolInput<'list', { projectId?: string }>
 */
export type ActionToolInput<A extends string, T = Record<string, never>> = {
  action: A;
} & T;

/**
 * Uniform handler return shape used by all mgmt tools.
 * Matches mcpResult / mcpError from @walkeros/core.
 */
export type ToolHandlerResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: true;
};

/**
 * True when the error looks like an authentication/authorization failure
 * from the walkerOS cloud API. Used to decide whether to append the
 * "Are you logged in?" hint on caught errors.
 */
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('invalid token') ||
    msg.includes('token expired') ||
    msg.includes('not authenticated')
  ) {
    return true;
  }
  const code = (error as Error & { code?: string }).code;
  if (!code) return false;
  const upperCode = code.toUpperCase();
  return (
    upperCode === 'UNAUTHORIZED' ||
    upperCode === 'FORBIDDEN' ||
    upperCode === '401' ||
    upperCode === '403' ||
    upperCode.startsWith('AUTH_')
  );
}

export const AUTH_HINT =
  'Are you logged in? Use auth(action: "status") to check.';
