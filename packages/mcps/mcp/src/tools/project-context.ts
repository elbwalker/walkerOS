import type { ToolClient } from '../tool-client.js';

export const NO_DEFAULT_PROJECT_ERROR =
  'No default project set and no projectId provided. Run project_manage action "set_default", or pass projectId.';

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
