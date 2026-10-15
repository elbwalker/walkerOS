/**
 * The app operations the CLI itself calls: the OAuth device flow, identity,
 * health, telemetry and the public API document. The app keeps every one in
 * its public API set, so its change rule protects them. The only file in the
 * CLI that names an app path; `walkeros api` takes its path from the person.
 */
export const APP_PATHS = {
  deviceAuthorization: '/api/oauth/device_authorization',
  token: '/api/oauth/token',
  revoke: '/api/oauth/revoke',
  whoami: '/api/auth/whoami',
  health: '/api/health',
  telemetry: '/api/telemetry',
  openapi: '/api/openapi.json',
} as const;
