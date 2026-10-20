/** The one credential the CLI sends: WALKEROS_TOKEN, a token from Account > Automation tokens. */
export function resolveAccessToken(): string | null {
  const token = process.env.WALKEROS_TOKEN;
  return token ? token : null;
}
