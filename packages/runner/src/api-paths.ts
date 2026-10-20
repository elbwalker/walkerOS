/**
 * The app operations the runner calls, as `"<METHOD> <path template>"`. They
 * are the runner's fixed interface: the app serves both to runner tokens only,
 * on its runner door, outside its public API set.
 *
 * The only file in the runner that names an app path.
 */
export const HEARTBEAT_OPERATION =
  'POST /api/projects/{projectId}/runners/heartbeat';
export const SECRET_VALUES_OPERATION =
  'GET /api/projects/{projectId}/flows/{flowId}/secrets/values';

/** The operation's absolute URL, each path parameter encoded once. */
function operationUrl(
  appUrl: string,
  operation: string,
  params: Readonly<Record<string, string>>,
): string {
  const template = operation.slice(operation.indexOf(' ') + 1);
  const path = template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`${operation}: path parameter ${name} is missing`);
    }
    return encodeURIComponent(value);
  });
  return `${appUrl}${path}`;
}

export function heartbeatUrl(appUrl: string, projectId: string): string {
  return operationUrl(appUrl, HEARTBEAT_OPERATION, { projectId });
}

export function secretValuesUrl(
  appUrl: string,
  projectId: string,
  flowId: string,
): string {
  return operationUrl(appUrl, SECRET_VALUES_OPERATION, { projectId, flowId });
}
