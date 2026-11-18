/**
 * The app operations the runner calls, as `"<METHOD> <path template>"`. They
 * are the runner's fixed interface, on the app's runner door, outside its
 * public API set. `runneros start` calls the first two at its app URL; the
 * remote operations go to the origin the runner's credential names.
 *
 * The only file in the runner that names an app path.
 */
export const HEARTBEAT_OPERATION =
  'POST /api/projects/{projectId}/runners/heartbeat';
export const SECRET_VALUES_OPERATION =
  'GET /api/projects/{projectId}/flows/{flowId}/secrets/values';

export const CHECK_IN_OPERATION = 'POST /api/runner/check-in';
export const RELEASE_OPERATION = 'GET /api/runner/release';
export const ARCHIVE_OPERATION =
  'GET /api/runner/versions/{versionId}/bundle-archive';
export const RELEASE_SECRETS_OPERATION =
  'GET /api/runner/versions/{versionId}/secrets';

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

export function checkInUrl(origin: string): string {
  return operationUrl(origin, CHECK_IN_OPERATION, {});
}

export function releaseUrl(origin: string): string {
  return operationUrl(origin, RELEASE_OPERATION, {});
}

export function archiveUrl(origin: string, versionId: string): string {
  return operationUrl(origin, ARCHIVE_OPERATION, { versionId });
}

export function releaseSecretsUrl(origin: string, versionId: string): string {
  return operationUrl(origin, RELEASE_SECRETS_OPERATION, { versionId });
}
