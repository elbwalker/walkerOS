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
 * True when the walkerOS cloud API refused the caller as unauthenticated: an
 * HTTP 401, or the code `UNAUTHORIZED` that the app answers a missing, invalid
 * or expired token with and the CLI raises when no login is stored. A 403
 * (`FORBIDDEN`, `INSUFFICIENT_SCOPE`, a feature gate) never is: that caller is
 * logged in and lacks a role, a scope or an entitlement. Read from the
 * structured `status` and `code`, never from the message.
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ('status' in error && error.status === 401) return true;
  return 'code' in error && error.code === 'UNAUTHORIZED';
}

/**
 * True when the walkerOS cloud API refused a logged-in caller: an HTTP 403, or
 * the code `FORBIDDEN` (a role) or `INSUFFICIENT_SCOPE` (a token scope) that
 * the hosted door carries without a status. Read from the structured `status`
 * and `code`, never from the message.
 */
export function isAccessRefusal(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ('status' in error && error.status === 403) return true;
  return (
    'code' in error &&
    (error.code === 'FORBIDDEN' || error.code === 'INSUFFICIENT_SCOPE')
  );
}

export const AUTH_HINT =
  'Are you logged in? Use auth(action: "status") to check.';
