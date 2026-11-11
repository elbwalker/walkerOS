/**
 * The app operations the CLI itself calls: identity, health, telemetry, the
 * public API document, and the two documents `walkeros login` discovers the
 * rest of a sign-in from (the authorization server metadata, RFC 8414, and
 * the CLI's own client document, whose URL is its client id). The app keeps
 * every one in its public API set, so its change rule protects them. The only
 * file in the CLI that names an app path; `walkeros api` takes its path from
 * the person.
 */
export const APP_PATHS = {
  whoami: '/api/auth/whoami',
  health: '/api/health',
  telemetry: '/api/telemetry',
  openapi: '/api/openapi.json',
  authorizationServer: '/.well-known/oauth-authorization-server',
  cliClient: '/oauth/walkeros-cli',
} as const;
