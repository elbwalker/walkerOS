import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalize,
  documentOperations,
  labelFloorRegressed,
  manifestEntries,
  manifestOperations,
  operationDigests,
  pruneToOperations,
  subsetUnchanged,
} from '../openapi-subset.js';

type Json = { [key: string]: unknown };

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });

function jsonBody(schema: Json): Json {
  return { content: { 'application/json': { schema } } };
}

/** A small document covering every shape the subset walks. */
function fixture(): Json {
  return {
    openapi: '3.1.0',
    info: {
      title: 'walkerOS Tag Manager API',
      version: '4.7.0+80fb4d79',
      description: 'API for managing flows.',
      summary: 'The API.',
    },
    servers: [{ url: '/', description: 'Current server' }],
    tags: [{ name: 'Projects', description: 'Project routes' }],
    externalDocs: { url: 'https://www.walkeros.io' },
    webhooks: {},
    paths: {
      '/api/things/{thingId}': {
        summary: 'Things',
        parameters: [
          {
            name: 'thingId',
            in: 'path',
            required: true,
            description: 'Thing id',
            schema: { type: 'string', example: 'thg_1' },
          },
        ],
        get: {
          summary: 'Read a thing',
          description: 'Reads one thing.',
          externalDocs: { url: 'https://www.walkeros.io/things' },
          tags: ['Things'],
          operationId: 'getThing',
          parameters: [
            {
              name: 'description',
              in: 'query',
              description: 'A query parameter named description',
              schema: { type: 'string' },
              example: 'x',
            },
            { $ref: '#/components/parameters/Limit' },
          ],
          responses: {
            '200': {
              description: 'The thing',
              headers: {
                'X-Thing-Version': {
                  description: 'Version',
                  schema: ref('Version'),
                },
              },
              content: {
                'application/json': {
                  schema: ref('Thing'),
                  example: { id: 'thg_1' },
                },
              },
            },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          summary: 'Delete a thing',
          responses: { '204': { description: 'Deleted' } },
        },
      },
      '/api/widgets': {
        post: {
          requestBody: jsonBody(ref('WidgetRequest')),
          responses: {
            '201': { description: 'Created', ...jsonBody(ref('Widget')) },
          },
        },
      },
      '/api/unused': {
        get: {
          responses: {
            '200': { description: 'x', ...jsonBody(ref('Unused')) },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', description: 'Bearer' },
      },
      parameters: {
        Limit: {
          name: 'limit',
          in: 'query',
          description: 'Page size',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        UnusedParam: { name: 'x', in: 'query', schema: { type: 'string' } },
      },
      responses: {
        NotFound: { description: 'Not found', ...jsonBody(ref('Error')) },
      },
      schemas: {
        Thing: {
          type: 'object',
          title: 'Thing',
          description: 'A thing.',
          required: ['id', 'description', 'title'],
          properties: {
            id: { type: 'string', description: 'Id', example: 'thg_1' },
            description: { type: 'string', description: 'Its description' },
            title: { type: ['string', 'null'], title: 'Title' },
            examples: { type: 'array', items: { type: 'string' } },
            kind: {
              type: 'string',
              enum: ['a', 'b'],
              default: 'a',
              deprecated: true,
            },
            created: {
              type: 'string',
              format: 'date-time',
              readOnly: true,
              nullable: true,
            },
            secret: { type: 'string', writeOnly: true, pattern: '^s_' },
            meta: { type: 'object', 'x-internal': { description: 'kept' } },
            child: ref('Child'),
            entry: {
              oneOf: [ref('EntryThread'), ref('EntryNote')],
              discriminator: {
                propertyName: 'kind',
                mapping: {
                  thread: '#/components/schemas/EntryThread',
                  description: '#/components/schemas/EntryNote',
                },
              },
            },
          },
        },
        Child: {
          type: 'object',
          properties: { grandchild: ref('Grandchild') },
        },
        Grandchild: {
          type: 'object',
          properties: { value: { type: 'integer', description: 'Leaf' } },
        },
        Node: {
          type: 'object',
          properties: { next: ref('Node') },
        },
        EntryThread: {
          type: 'object',
          properties: { kind: { const: 'thread' } },
        },
        EntryNote: { type: 'object', properties: { kind: { const: 'note' } } },
        Version: { type: 'string' },
        Error: { type: 'object', properties: { message: { type: 'string' } } },
        WidgetRequest: {
          type: 'object',
          properties: { root: ref('Node') },
          examples: [{ root: {} }],
        },
        Widget: { type: 'object', properties: { id: { type: 'string' } } },
        Unused: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
  };
}

const OPS = ['GET /api/things/{thingId}', 'POST /api/widgets'];

function isJson(value: unknown): value is Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The value itself, narrowed to an object, so a test can mutate it in place. */
function record(value: unknown): Json {
  if (!isJson(value))
    throw new Error(`not an object: ${JSON.stringify(value)}`);
  return value;
}

function at(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) current = record(current)[key];
  return current;
}

describe('pruneToOperations', () => {
  const pruned = pruneToOperations(fixture(), OPS);

  it('keeps exactly the listed operations, with their path-level parameters', () => {
    expect(documentOperations(pruned)).toEqual(OPS);
    expect(Object.keys(record(pruned.paths))).toEqual([
      '/api/things/{thingId}',
      '/api/widgets',
    ]);
    expect(at(pruned, 'paths', '/api/things/{thingId}', 'parameters')).toEqual([
      {
        name: 'thingId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    ]);
  });

  it('keeps the $ref closure and drops unreferenced components', () => {
    const components = record(pruned.components);
    // Nested (Thing -> Child -> Grandchild), recursive (Node -> Node), refs in
    // parameters, request bodies, responses and headers, and discriminator
    // mapping targets.
    expect(Object.keys(record(components.schemas)).sort()).toEqual(
      [
        'Child',
        'EntryNote',
        'EntryThread',
        'Error',
        'Grandchild',
        'Node',
        'Thing',
        'Version',
        'Widget',
        'WidgetRequest',
      ].sort(),
    );
    expect(Object.keys(record(components.parameters))).toEqual(['Limit']);
    expect(Object.keys(record(components.responses))).toEqual(['NotFound']);
    expect(components.securitySchemes).toEqual({
      bearer: { type: 'http', scheme: 'bearer' },
    });
  });

  it('keeps properties, parameters and required entries named like doc keywords', () => {
    const thing = at(pruned, 'components', 'schemas', 'Thing');
    expect(Object.keys(record(at(thing, 'properties')))).toEqual([
      'id',
      'description',
      'title',
      'examples',
      'kind',
      'created',
      'secret',
      'meta',
      'child',
      'entry',
    ]);
    expect(at(thing, 'properties', 'description')).toEqual({ type: 'string' });
    expect(at(thing, 'required')).toEqual(['id', 'description', 'title']);
    expect(
      at(pruned, 'paths', '/api/things/{thingId}', 'get', 'parameters'),
    ).toEqual([
      { name: 'description', in: 'query', schema: { type: 'string' } },
      { $ref: '#/components/parameters/Limit' },
    ]);
    expect(
      at(thing, 'properties', 'entry', 'discriminator', 'mapping'),
    ).toEqual({
      thread: '#/components/schemas/EntryThread',
      description: '#/components/schemas/EntryNote',
    });
  });

  it.each<[string, string[], unknown]>([
    [
      'an operation',
      ['paths', '/api/things/{thingId}', 'get'],
      {
        operationId: 'getThing',
      },
    ],
    [
      'a parameter',
      ['components', 'parameters', 'Limit'],
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    ],
    [
      'a schema',
      ['components', 'schemas', 'Grandchild'],
      { type: 'object', properties: { value: { type: 'integer' } } },
    ],
    [
      'info',
      ['info'],
      { title: 'walkerOS Tag Manager API', version: '4.7.0+80fb4d79' },
    ],
  ])('strips doc keywords at %s level', (_level, keys, expected) => {
    const node = record(at(pruned, ...keys));
    if (keys[0] === 'paths') {
      // The operation keeps its wire parts; compare the rest.
      const { parameters: _p, responses: _r, ...rest } = node;
      expect(rest).toEqual(expected);
    } else {
      expect(node).toEqual(expected);
    }
  });

  it('drops the top-level tags, webhooks and externalDocs and strips servers', () => {
    expect(Object.keys(pruned)).toEqual([
      'openapi',
      'info',
      'servers',
      'paths',
      'components',
    ]);
    expect(pruned.servers).toEqual([{ url: '/' }]);
  });

  it('keeps an empty description on every Response object', () => {
    const get = at(pruned, 'paths', '/api/things/{thingId}', 'get');
    expect(at(get, 'responses', '200', 'description')).toBe('');
    expect(at(get, 'responses', '200', 'headers')).toEqual({
      'X-Thing-Version': { schema: ref('Version') },
    });
    expect(at(get, 'responses', '200', 'content')).toEqual({
      'application/json': { schema: ref('Thing') },
    });
    expect(at(get, 'responses', '404')).toEqual({
      $ref: '#/components/responses/NotFound',
    });
    expect(at(pruned, 'components', 'responses', 'NotFound')).toEqual({
      description: '',
      ...jsonBody(ref('Error')),
    });
  });

  it.each([
    [
      'enum and default',
      'kind',
      { type: 'string', enum: ['a', 'b'], default: 'a', deprecated: true },
    ],
    [
      'format, readOnly and nullable',
      'created',
      { type: 'string', format: 'date-time', readOnly: true, nullable: true },
    ],
    [
      'writeOnly and pattern',
      'secret',
      { type: 'string', writeOnly: true, pattern: '^s_' },
    ],
    [
      'x- extensions',
      'meta',
      { type: 'object', 'x-internal': { description: 'kept' } },
    ],
  ])('keeps %s unchanged', (_label, property, expected) => {
    expect(
      at(pruned, 'components', 'schemas', 'Thing', 'properties', property),
    ).toEqual(expected);
  });

  it('throws for a manifest operation the input lacks', () => {
    expect(() =>
      pruneToOperations(fixture(), [...OPS, 'GET /api/missing']),
    ).toThrow('manifest operation not in input: GET /api/missing');
  });

  it('changes nothing when pruning a pruned document', () => {
    expect(pruneToOperations(pruned, OPS)).toEqual(pruned);
    expect(JSON.stringify(pruneToOperations(pruned, OPS))).toBe(
      JSON.stringify(pruned),
    );
  });
});

describe('operationDigests', () => {
  const base = operationDigests(fixture(), OPS);

  it('is equal across a description-only change', () => {
    const changed = fixture();
    const thing = record(at(changed, 'components', 'schemas', 'Thing'));
    thing.description = 'A different description.';
    record(at(thing, 'properties', 'id')).description = 'Changed';
    record(at(changed, 'paths', '/api/things/{thingId}', 'get')).summary =
      'Changed';
    expect(operationDigests(changed, OPS)).toEqual(base);
  });

  it('changes only for the operations that reach a changed schema', () => {
    const changed = fixture();
    const grandchild = record(
      at(changed, 'components', 'schemas', 'Grandchild'),
    );
    record(at(grandchild, 'properties', 'value')).type = 'string';
    const digests = operationDigests(changed, OPS);
    expect(digests['GET /api/things/{thingId}']).not.toBe(
      base['GET /api/things/{thingId}'],
    );
    expect(digests['POST /api/widgets']).toBe(base['POST /api/widgets']);
  });

  it('is equal across an operation tags change', () => {
    const changed = fixture();
    record(at(changed, 'paths', '/api/things/{thingId}', 'get')).tags = [
      'Other',
    ];
    expect(operationDigests(changed, OPS)).toEqual(base);
  });

  it('terminates on a recursive schema and leaves out operations the input lacks', () => {
    const digests = operationDigests(fixture(), [...OPS, 'GET /api/missing']);
    expect(Object.keys(digests)).toEqual(OPS);
    expect(digests['POST /api/widgets']).toMatch(/^[0-9a-f]{64}$/);
  });
});

/**
 * Schema properties named like keywords (`default`, `required`, `mapping`),
 * each a name in a `properties` map, never a keyword.
 */
function keywordNamedProperties(target: Json = { type: 'string' }): Json {
  return {
    openapi: '3.1.0',
    info: { title: 'walkerOS', version: '4.7.0+80fb4d79' },
    paths: {
      '/api/settings': {
        get: {
          responses: {
            '200': {
              description: 'OK',
              content: { 'application/json': { schema: ref('Settings') } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Settings: {
          type: 'object',
          properties: {
            default: ref('Fallback'),
            required: ref('Rules'),
            mapping: { type: 'object', additionalProperties: true },
          },
          required: ['default'],
        },
        Fallback: target,
        Rules: { type: 'array', items: { type: 'string' } },
        Unused: { type: 'string' },
      },
    },
  };
}

describe('properties named like keywords', () => {
  const op = ['GET /api/settings'];

  it('keeps the components they reference', () => {
    const pruned = pruneToOperations(keywordNamedProperties(), op);
    expect(Object.keys(record(at(pruned, 'components', 'schemas')))).toEqual([
      'Settings',
      'Fallback',
      'Rules',
    ]);
  });

  it('changes the digest when a component they reference changes', () => {
    const base = operationDigests(keywordNamedProperties(), op);
    const changed = operationDigests(
      keywordNamedProperties({ type: 'integer' }),
      op,
    );
    expect(changed[op[0]]).not.toBe(base[op[0]]);

    const rules = keywordNamedProperties();
    record(at(rules, 'components', 'schemas', 'Rules', 'items')).type =
      'integer';
    expect(operationDigests(rules, op)[op[0]]).not.toBe(base[op[0]]);
  });

  it('reads a property named mapping as a schema, not a discriminator map', () => {
    expect(() => operationDigests(keywordNamedProperties(), op)).not.toThrow();
    expect(
      at(
        pruneToOperations(keywordNamedProperties(), op),
        'components',
        'schemas',
        'Settings',
        'properties',
        'mapping',
      ),
    ).toEqual({ type: 'object', additionalProperties: true });
  });
});

describe('subsetUnchanged', () => {
  const withLabel = (version: string): Json => ({
    ...fixture(),
    info: { title: 'walkerOS Tag Manager API', version },
  });

  it('is true for a label-only change with the same floor', () => {
    expect(
      subsetUnchanged(withLabel('4.7.0+80fb4d79'), withLabel('4.7.0+1a2b3c4d')),
    ).toBe(true);
  });

  it('is true for an identical subset', () => {
    expect(subsetUnchanged(withLabel('4.7.1'), withLabel('4.7.1'))).toBe(true);
  });

  it('is false for a floor change', () => {
    expect(
      subsetUnchanged(withLabel('4.7.0+80fb4d79'), withLabel('4.8.0+1a2b3c4d')),
    ).toBe(false);
  });

  it('is false for a legacy label next to a floored one', () => {
    expect(
      subsetUnchanged(withLabel('4.7.0'), withLabel('4.7.0+1a2b3c4d')),
    ).toBe(false);
  });

  it('is false for a wire change', () => {
    const next = withLabel('4.7.0+80fb4d79');
    record(
      at(next, 'components', 'schemas', 'Grandchild', 'properties', 'value'),
    ).type = 'string';
    expect(subsetUnchanged(withLabel('4.7.0+80fb4d79'), next)).toBe(false);
  });

  it('is false without a previous subset', () => {
    expect(subsetUnchanged(undefined, withLabel('4.7.0+80fb4d79'))).toBe(false);
  });
});

describe('canonicalize', () => {
  it('orders keys recursively and keeps array order', () => {
    expect(JSON.stringify(canonicalize({ b: [2, { d: 1, c: 0 }], a: 1 }))).toBe(
      '{"a":1,"b":[2,{"c":0,"d":1}]}',
    );
  });
});

describe('labelFloorRegressed', () => {
  it.each([
    ['4.7.0+80fb4d79', '4.7.0+1a2b3c4d', false],
    ['4.7.0+80fb4d79', '4.8.0+1a2b3c4d', false],
    ['4.7.0+80fb4d79', '5.0.0+1a2b3c4d', false],
    ['4.7.0+80fb4d79', '4.6.1+1a2b3c4d', true],
    ['4.10.0+80fb4d79', '4.9.0+1a2b3c4d', true],
    ['4.7.0+80fb4d79', '4.7.0-next.1+1a2b3c4d', true],
    ['4.7.0+80fb4d79', '4.6.1', true],
  ])('%s to %s regressed: %s', (base, head, regressed) => {
    expect(labelFloorRegressed(base, head)).toBe(regressed);
  });

  it.each([
    ['4.7.1', '4.7.0+80fb4d79'],
    ['1.1.0', '1.0.0'],
    ['3.1.0', '4.7.0+80fb4d79'],
  ])('skips the legacy base %s (no build metadata)', (base, head) => {
    expect(labelFloorRegressed(base, head)).toBe(false);
  });

  it('throws for a label that is not a version', () => {
    expect(() => labelFloorRegressed('4.7.0+80fb4d79', 'latest')).toThrow(
      'invalid contract label: latest',
    );
  });
});

describe('the shipped client operations manifest', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  const manifest: unknown = JSON.parse(
    readFileSync(join(root, 'openapi/client-operations.json'), 'utf-8'),
  );
  const spec: unknown = JSON.parse(
    readFileSync(join(root, 'openapi/spec.json'), 'utf-8'),
  );
  const ops = manifestOperations(manifest);

  it('is sorted by path, then method, without duplicates', () => {
    const key = (op: string) => {
      const space = op.indexOf(' ');
      return `${op.slice(space + 1)} ${op.slice(0, space)}`;
    };
    const sorted = [...ops].sort((a, b) =>
      key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0,
    );
    expect(ops).toEqual(sorted);
    expect(new Set(ops).size).toBe(ops.length);
  });

  it('matches the operations of the shipped spec exactly', () => {
    expect([...documentOperations(spec)].sort()).toEqual([...ops].sort());
  });

  it('is what the shipped spec prunes to', () => {
    expect(pruneToOperations(spec, ops)).toEqual(spec);
  });

  it('keeps each entry with its callers', () => {
    expect(manifestEntries(manifest).map((entry) => entry.op)).toEqual(ops);
    expect(
      manifestEntries([{ op: 'GET /api/x', usedBy: ['walkeros x'] }]),
    ).toEqual([{ op: 'GET /api/x', usedBy: ['walkeros x'] }]);
  });

  it('rejects any other shape', () => {
    expect(() => manifestOperations({ ops: [] })).toThrow(
      'client operations manifest is not a list',
    );
    expect(() => manifestOperations([{ op: 'GET /api/x' }])).toThrow(
      'client operations manifest entry is not { op, usedBy }',
    );
    expect(() =>
      manifestOperations([{ op: 'FETCH /api/x', usedBy: [] }]),
    ).toThrow('invalid operation: FETCH /api/x');
  });
});
