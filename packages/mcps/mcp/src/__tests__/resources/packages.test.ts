import '../support/version.js';

import { clearCatalogCache } from '../../catalog.js';
import { KNOWLEDGE_RESOURCES } from '../../specs.js';
import { registerResourceSpec } from '../../server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { record, str } from '../support/tool-result.js';

/**
 * H4: the packages resource answers what package_search's browse mode
 * answers, `{ catalog, count, warnings? }`, so a failed npm search reads as
 * "npm was unreachable", never as "no packages exist".
 */
async function readPackages(): Promise<unknown> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  for (const spec of KNOWLEDGE_RESOURCES) registerResourceSpec(server, spec);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const result = await client.readResource({
    uri: 'walkeros://reference/packages',
  });
  return JSON.parse(str(record(result.contents[0]).text));
}

describe('walkeros://reference/packages', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    clearCatalogCache();
  });

  it('answers an empty catalog with the npm failure as a warning', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('https://registry.npmjs.org/'))
        throw new TypeError('fetch failed');
      return new Response('{}', { status: 200 });
    };
    global.fetch = fetchMock;

    expect(await readPackages()).toEqual({
      catalog: [],
      count: 0,
      warnings: [
        'npm package search failed (fetch failed); the package catalog is empty. Try again, or use package_get with an exact package name.',
      ],
    });
  });

  it('answers catalog and count without warnings when the search succeeds', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith('https://registry.npmjs.org/'))
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
      return new Response(
        JSON.stringify({ $meta: { type: 'destination', platform: 'web' } }),
        { status: 200 },
      );
    };
    global.fetch = fetchMock;

    const answer = record(await readPackages());
    expect(Object.keys(answer).sort()).toEqual(['catalog', 'count']);
    expect(answer.count).toBe(1);
    expect(answer.catalog).toEqual([
      expect.objectContaining({ name: '@walkeros/web-destination-gtag' }),
    ]);
  });
});
