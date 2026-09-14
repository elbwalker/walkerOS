import type { ToolClient } from '../tool-client.js';

/** `flow_` and `cfg_` are reserved walkerOS API id namespaces. A configPath
 *  matching either is a cloud flow/config id, resolved via the client rather
 *  than treated as a local file path, URL, or inline JSON. */
const API_ID_PREFIX = /^(flow|cfg)_/;

/**
 * Resolve a `configPath` for tools that consume it (simulate, bundle). When it
 * is a cloud flow/config id, fetch the flow via the same client seam `flow_load`
 * uses and return its config serialized as JSON (the underlying CLI functions
 * accept inline JSON as `configPath`). Otherwise return the value unchanged so
 * file paths, URLs, and inline JSON pass through as before.
 */
export async function resolveConfigPath(
  client: Pick<ToolClient, 'getFlow'>,
  configPath: string,
): Promise<string> {
  if (!API_ID_PREFIX.test(configPath)) return configPath;

  const flow = await client.getFlow({ flowId: configPath });
  const config = (flow as { config?: Record<string, unknown> }).config;
  return JSON.stringify(config ?? {});
}
