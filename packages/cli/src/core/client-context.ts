export type ClientType = 'cli' | 'mcp' | 'runner';

export interface ClientContext {
  type: ClientType;
  version: string;
}

let context: ClientContext | undefined;

/**
 * Set the client context used to identify this process to the walkerOS app.
 *
 * The CLI binary calls this at startup, the MCP server calls it on boot, and
 * the runner Docker image overrides the resolved type via the
 * `WALKEROS_CLIENT_TYPE` env var (env wins over `input.type`).
 */
export function setClientContext(input: {
  type?: ClientType;
  version: string;
}): void {
  const envType = process.env.WALKEROS_CLIENT_TYPE as ClientType | undefined;
  // Env wins over input.type — lets the runner Docker image override the
  // default chosen by the binary entry point without code changes.
  const type = envType ?? input.type ?? 'cli';
  context = { type, version: input.version };
}

export function getClientContext(): ClientContext | undefined {
  return context;
}

export function resetClientContext(): void {
  context = undefined;
}

/**
 * Produce the outbound client-identification headers, or an empty object when
 * no context has been set yet (e.g. in tests or pre-bootstrap code paths).
 */
export function clientContextHeaders(): Record<string, string> {
  if (!context) return {};
  return {
    'User-Agent': `walkeros-${context.type}/${context.version}`,
    'X-WalkerOS-Client': context.type,
    'X-WalkerOS-Client-Version': context.version,
  };
}
