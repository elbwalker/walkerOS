import type { ToolClient } from '../tool-client.js';
import { flowConfigOf, isCloudId } from '../cloud-flow.js';
import { RuntimeRefusal, type FlowRuntime } from './types.js';

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Whether a bare string is shaped like a filesystem path: it names a directory
 * hop, starts with a dot, or carries a file extension. Nothing is ever read
 * either way; the distinction only decides which error a hosted load raises.
 * A path-shaped input is refused outright, while a plain phrase such as an
 * event name is merely unresolvable here, which is what lets `flow_validate`
 * keep its event-name shorthand.
 */
function looksLikePath(value: string): boolean {
  return (
    /[\\/]/.test(value) ||
    value.startsWith('.') ||
    /\.[A-Za-z0-9]+$/.test(value)
  );
}

export type ConfigInputKind =
  | 'inline-json'
  | 'cloud-id'
  | 'url'
  | 'local-path'
  | 'bare-string';

/**
 * Classify a config input the way the local loader would resolve it: an
 * http(s) URL, a reserved cloud id, an inline JSON document, a path-shaped
 * string, or a bare string that names none of these. Order matters, a URL is
 * checked before the cloud-id and JSON shapes.
 */
export function classifyConfigInput(input: string): ConfigInputKind {
  const trimmed = input.trim();
  if (isHttpUrl(trimmed)) return 'url';
  if (isCloudId(trimmed)) return 'cloud-id';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'inline-json';
  if (looksLikePath(trimmed)) return 'local-path';
  return 'bare-string';
}

const HINT_INLINE_OR_ID =
  'Pass the flow inline as JSON, or reference a saved flow by its flow_ or cfg_ id.';

function refuseLocalPath(): RuntimeRefusal {
  return new RuntimeRefusal(
    'Local file paths are not available on the hosted walkerOS MCP server.',
    HINT_INLINE_OR_ID,
  );
}

function refuseUrl(): RuntimeRefusal {
  return new RuntimeRefusal(
    'Fetching URLs is not available on the hosted walkerOS MCP server.',
    HINT_INLINE_OR_ID,
  );
}

function parseInline(trimmed: string): unknown {
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Input appears to be JSON but contains errors: ${message}`);
  }
}

/**
 * The least-privilege runtime for a shared, network-reached process: the app's
 * OAuth door, in-app chat, and any third-party HTTP host.
 *
 * It never touches the filesystem or the network on the caller's behalf. A
 * saved `flow_`/`cfg_` id is resolved through the access-scoped tool client, a
 * document is parsed inline, and everything else is refused. `bundle`,
 * `simulate` and `push` are deliberately absent: compiling or importing a
 * caller's flow pulls that caller's code (inline or by package name) into this
 * process, and no input shape makes that safe here.
 */
export function createHostedRuntime(
  client: Pick<ToolClient, 'getFlow'>,
): FlowRuntime {
  return {
    async load(input) {
      const trimmed = input.trim();
      if (trimmed === '') throw new Error('Input is required');
      switch (classifyConfigInput(trimmed)) {
        case 'url':
          throw refuseUrl();
        case 'cloud-id':
          return flowConfigOf(await client.getFlow({ flowId: trimmed }));
        case 'inline-json':
          return parseInline(trimmed);
        case 'local-path':
          throw refuseLocalPath();
        case 'bare-string':
          // Not a refusal: nothing was withheld, the input simply names nothing
          // this runtime can resolve.
          throw new Error(
            `Cannot resolve "${trimmed}" on the hosted walkerOS MCP server. ${HINT_INLINE_OR_ID}`,
          );
      }
    },
  };
}
