import '../support/version.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerReferenceResources } from '../../resources/references.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { record, str } from '../support/tool-result.js';

/**
 * Register the reference resources on a real McpServer and read them back
 * through a connected client, the way an MCP host does.
 */
async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerReferenceResources(server);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

/** The text of a read resource's first content block. */
function firstText(result: { contents: unknown[] }): string {
  return str(record(result.contents[0]).text);
}

// Read the real bundled spec the build embeds, to assert the resource serves it.
// resources -> __tests__ -> src -> mcp -> mcps -> packages, then into cli.
const here = dirname(fileURLToPath(import.meta.url));
const specPath = join(here, '../../../../../cli/openapi/spec.json');
interface SpecShape {
  info: { version: string };
}
function parseSpec(text: string): SpecShape {
  const parsed: unknown = JSON.parse(text);
  if (
    parsed &&
    typeof parsed === 'object' &&
    'info' in parsed &&
    parsed.info &&
    typeof parsed.info === 'object' &&
    'version' in parsed.info &&
    typeof parsed.info.version === 'string'
  ) {
    return { info: { version: parsed.info.version } };
  }
  throw new Error('spec.json missing info.version');
}
const bundledSpec = parseSpec(readFileSync(specPath, 'utf-8'));

describe('openapi reference resource serves the embedded bundled spec', () => {
  it('returns the real spec with info.version, not the error fallback', async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();
    const resource = resources.find((r) => r.name === 'openapi');
    expect(resource).toBeDefined();

    const result = await client.readResource({
      uri: 'walkeros://reference/openapi',
    });
    const text = firstText(result);

    // The resource imports the spec statically, so serving it at all plus the
    // version match below proves the real spec. A substring scan for an error
    // marker would false-positive on legitimate spec content (404 descriptions
    // contain "not found").
    const parsed = parseSpec(text);
    expect(parsed.info.version).toBeDefined();
    expect(parsed.info.version).toBe(bundledSpec.info.version);
  });
});
