import '../support/version.js';

import { clearCatalogCache } from '../../catalog.js';
import { KNOWLEDGE_RESOURCES } from '../../specs.js';
import { registerResourceSpec } from '../../server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { record, rows, str } from '../support/tool-result.js';

/**
 * Register the reference resources on a real McpServer and read them back
 * through a connected client, the way an MCP host does.
 */
async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  for (const spec of KNOWLEDGE_RESOURCES) registerResourceSpec(server, spec);
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

describe('packages reference resource', () => {
  const originalAppUrl = process.env.WALKEROS_APP_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalAppUrl !== undefined) {
      process.env.WALKEROS_APP_URL = originalAppUrl;
    } else {
      delete process.env.WALKEROS_APP_URL;
    }
    global.fetch = originalFetch;
    clearCatalogCache();
  });

  it('reads npm and jsDelivr only, even with WALKEROS_APP_URL set', async () => {
    process.env.WALKEROS_APP_URL = 'https://app.example.test';
    const fetchedUrls: string[] = [];
    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      fetchedUrls.push(url);
      if (url.startsWith('https://registry.npmjs.org/')) {
        return new Response(
          JSON.stringify({
            objects: [
              {
                package: {
                  name: '@walkeros/web-destination-gtag',
                  version: '1.0.0',
                  description: 'GA4',
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ $meta: { type: 'destination', platform: 'web' } }),
        { status: 200 },
      );
    };
    global.fetch = fetchMock;

    const client = await connectedClient();
    const result = await client.readResource({
      uri: 'walkeros://reference/packages',
    });
    const parsed: unknown = JSON.parse(firstText(result));
    expect(rows(parsed)[0].name).toBe('@walkeros/web-destination-gtag');
    expect(
      fetchedUrls.every(
        (u) =>
          u.startsWith('https://registry.npmjs.org/') ||
          u.startsWith('https://cdn.jsdelivr.net/'),
      ),
    ).toBe(true);
  });
});
