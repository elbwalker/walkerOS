import type { ToolClient } from '../tool-client.js';

/**
 * Shared by every project-bound tool, so the remedy is worded once.
 *
 * It names what to do, not just what went wrong, and it names where to get the
 * missing value. The per-call remedy leads because it always works: a selection
 * made with `set_default` is held by the process serving the connection and is
 * gone after a reconnect, by the ruling in the app's MCP route.
 */
export const NO_DEFAULT_PROJECT_ERROR =
  'No project selected and no projectId given. Pass projectId on this call, or call project_manage action "set_default" to select one. project_manage action "list" returns the available ids.';

/** Resolves the project for actions that fall back to the CLI default when
 *  `projectId` is omitted. Returns the resolved id, or undefined when there is
 *  no default to fall back to (the no-project-at-all case). An explicit
 *  `projectId` is always honoured as-is so the app's genuine NOT_FOUND still
 *  surfaces for an explicit-but-wrong id. */
export function resolveDefaultProject(
  client: ToolClient,
  projectId: string | undefined,
): string | undefined {
  return projectId ?? client.getDefaultProject() ?? undefined;
}
