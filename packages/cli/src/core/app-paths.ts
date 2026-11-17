/**
 * The app operations the CLI itself calls: identity, health, telemetry, the
 * public API document, and the REST API's protected resource document
 * (RFC 9728), which names the authorization server `walkeros login` signs in
 * with. The app keeps every one in its public API set, so its change rule
 * protects them. The only file in the CLI that names an app path; `walkeros
 * api` takes its path from the person, and the authorization server's paths
 * are read on its own origin (`core/oauth-login.ts`).
 */
export const APP_PATHS = {
  whoami: '/api/auth/whoami',
  health: '/api/health',
  telemetry: '/api/telemetry',
  openapi: '/api/openapi.json',
  protectedResource: '/.well-known/oauth-protected-resource/api',
} as const;
