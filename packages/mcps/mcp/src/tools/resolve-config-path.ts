import type { ToolClient } from '../tool-client.js';
import { flowConfigOf, isCloudId } from '../cloud-flow.js';

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
  if (!isCloudId(configPath)) return configPath;

  const flow = await client.getFlow({ flowId: configPath });
  return JSON.stringify(flowConfigOf(flow));
}
