import { registerReferenceResources } from '../../resources/references.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { record, rows, str } from '../support/tool-result.js';
import { stubClient } from '../support/stub-client.js';

jest.mock('../../catalog.js', () => ({
  fetchCatalog: jest.fn().mockResolvedValue({
    entries: [
      {
        name: '@walkeros/test-pkg',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
        description: 'Test package',
      },
    ],
    warnings: [],
  }),
  getPackageBaseUrl: jest.fn(() => undefined),
}));

/**
 * Register the reference resources on a real McpServer and read them back
 * through a connected client, the way an MCP host does.
 */
async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerReferenceResources(server, stubClient());
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

/** Whether a resource with this name is registered. */
async function hasResource(name: string): Promise<boolean> {
  const { resources } = await client.listResources();
  return resources.some((resource) => resource.name === name);
}

/** The first content block's text of a reference resource, parsed. */
async function readReference(name: string): Promise<unknown> {
  const result = await client.readResource({
    uri: `walkeros://reference/${name}`,
  });
  return JSON.parse(str(record(result.contents[0]).text));
}

/**
 * Zod v4's `toJSONSchema` wraps the root in `allOf: [{ $ref: '#/definitions/X' }]`
 * with the actual object schema under `definitions.X`. This helper returns the
 * concrete root definition so tests can assert on `type` / `properties`.
 */
function resolveRoot(parsed: Record<string, unknown>): Record<string, unknown> {
  const allOf = Array.isArray(parsed.allOf) ? rows(parsed.allOf) : undefined;
  const ref = allOf?.[0]?.$ref;
  const defs = parsed.definitions;
  if (typeof ref !== 'string' || !isPlainObject(defs)) return parsed;
  const name = ref.replace('#/definitions/', '');
  const def = defs[name];
  return isPlainObject(def) ? def : parsed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

let client: Client;

describe('reference resources', () => {
  beforeEach(async () => {
    client = await connectedClient();
  });

  describe('flow-schema', () => {
    it('should register flow-schema resource', async () => {
      expect(await hasResource('flow-schema')).toBe(true);
    });

    it('should return a valid JSON Schema with config properties', async () => {
      const parsed = record(await readReference('flow-schema'));
      const root = resolveRoot(parsed);
      const props = root.properties;

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(root.type).toBe('object');
      expect(props).toBeDefined();
      expect(record(props).version).toBeDefined();
      expect(record(props).flows).toBeDefined();
      expect(record(props).variables).toBeDefined();
      expect(record(props).contract).toBeDefined();
      // Descriptions auto-generated from Zod .describe()
      expect(record(record(props).flows).description).toBeDefined();
    });
  });

  describe('event-model', () => {
    it('should return a valid JSON Schema for events', async () => {
      const parsed = record(await readReference('event-model'));
      const root = resolveRoot(parsed);
      const props = root.properties;

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(props).toBeDefined();
      expect(record(props).name).toBeDefined();
      expect(record(props).data).toBeDefined();
      expect(record(props).entity).toBeDefined();
      expect(record(props).action).toBeDefined();
    });
  });

  describe('mapping', () => {
    it('should return JSON Schemas for mapping components', async () => {
      const parsed = record(await readReference('mapping'));

      expect(parsed.rules).toBeDefined();
      expect(record(parsed.rules).$schema).toBe(
        'http://json-schema.org/draft-07/schema#',
      );
      expect(parsed.valueConfig).toBeDefined();
      expect(parsed.rule).toBeDefined();
      expect(parsed.policy).toBeDefined();
    });
  });

  describe('contract', () => {
    it('should return a valid JSON Schema', async () => {
      const parsed = record(await readReference('contract'));

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });
  });

  describe('consent', () => {
    it('should return a valid JSON Schema', async () => {
      const parsed = record(await readReference('consent'));

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });
  });

  describe('variables', () => {
    it('should return interpolation pattern reference (hand-maintained)', async () => {
      const parsed = record(await readReference('variables'));

      expect(parsed.patterns).toBeDefined();
      expect(record(parsed.patterns)['$var.name']).toBeDefined();
      expect(record(parsed.patterns)['$env.NAME']).toBeDefined();
      expect(record(parsed.patterns)['$code:(expr)']).toBeDefined();
      expect(record(parsed.patterns)['$store.storeId']).toBeDefined();
    });
  });

  describe('examples', () => {
    it('should register examples resource', async () => {
      expect(await hasResource('examples')).toBe(true);
    });

    it('should return a valid flow config from real file', async () => {
      const parsed = record(await readReference('examples'));

      expect(parsed.version).toBe(4);
      expect(parsed.flows).toBeDefined();
    });
  });

  describe('already-automated resources', () => {
    it('should register openapi resource', async () => {
      expect(await hasResource('openapi')).toBe(true);
    });

    it('should register packages resource', async () => {
      expect(await hasResource('packages')).toBe(true);
    });

    it('packages resource returns catalog entries', async () => {
      const parsed = await readReference('packages');

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(rows(parsed)[0]?.name).toBe('@walkeros/test-pkg');
    });
  });
});
