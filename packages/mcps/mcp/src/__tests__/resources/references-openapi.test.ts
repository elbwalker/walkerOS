import '../support/version.js';

import { registerReferenceResources } from '../../resources/references.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { record, str } from '../support/tool-result.js';
import { stubClient } from '../support/stub-client.js';
import type { ToolClient } from '../../tool-client.js';

/**
 * Register the reference resources for a door on a real McpServer and read
 * the openapi resource back through a connected client, the way an MCP host
 * does.
 */
async function readOpenapi(
  door: ToolClient,
): Promise<{ text: string; mimeType: string }> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerReferenceResources(server, door);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const { resources } = await client.listResources();
  expect(resources.find((r) => r.name === 'openapi')).toBeDefined();
  const result = await client.readResource({
    uri: 'walkeros://reference/openapi',
  });
  const content = record(result.contents[0]);
  return { text: str(content.text), mimeType: str(content.mimeType) };
}

const LIVE_DOCUMENT = {
  openapi: '3.1.0',
  info: { title: 'walkerOS', version: '4.7.0+80fb4d79' },
  paths: { '/api/health': { get: { responses: {} } } },
};

describe('openapi reference resource', () => {
  it("serves the client's live document", async () => {
    let calls = 0;
    const door = stubClient({
      openapiDocument: async () => {
        calls += 1;
        return LIVE_DOCUMENT;
      },
    });
    const { text, mimeType } = await readOpenapi(door);
    expect(JSON.parse(text)).toEqual(LIVE_DOCUMENT);
    expect(mimeType).toBe('application/json');
    expect(calls).toBe(1);
  });

  it('states the reason when the document cannot be read', async () => {
    const door = stubClient({
      openapiDocument: async () => {
        throw new Error(
          'GET https://app.walkeros.io/api/openapi.json: HTTP 503',
        );
      },
    });
    expect(await readOpenapi(door)).toEqual({
      text: 'openapi document unavailable: GET https://app.walkeros.io/api/openapi.json: HTTP 503',
      mimeType: 'text/plain',
    });
  });

  it('states that a client without the method has no document', async () => {
    const { openapiDocument: _omit, ...withoutDocument } = stubClient();
    expect(await readOpenapi(withoutDocument)).toEqual({
      text: 'openapi document unavailable: no openapi document on this client',
      mimeType: 'text/plain',
    });
  });
});
