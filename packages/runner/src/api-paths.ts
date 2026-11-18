/**
 * The app operations the runner calls, as `"<METHOD> <path template>"`. They
 * are the runner's fixed interface, on the app's runner door, outside its
 * public API set, and take no id: the credential names the deployment. Every
 * one goes to the origin the runner's credential names. `runneros start`
 * calls the check-in and the secrets read.
 *
 * The only file in the runner that names an app path.
 */
export const CHECK_IN_OPERATION = 'POST /api/runner/check-in';
export const SECRETS_OPERATION = 'GET /api/runner/secrets';
export const RELEASE_OPERATION = 'GET /api/runner/release';
export const ARCHIVE_OPERATION =
  'GET /api/runner/versions/{versionId}/bundle-archive';
export const RELEASE_SECRETS_OPERATION =
  'GET /api/runner/versions/{versionId}/secrets';

/** The operation's absolute URL, each path parameter encoded once. */
function operationUrl(
  origin: string,
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
  return `${origin}${path}`;
}

export function checkInUrl(origin: string): string {
  return operationUrl(origin, CHECK_IN_OPERATION, {});
}

export function secretsUrl(origin: string): string {
  return operationUrl(origin, SECRETS_OPERATION, {});
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
