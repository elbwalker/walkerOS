import { z } from '../validation';
import * as allSchemas from '..';

/**
 * Meta coverage regression test.
 *
 * Every exported `*Schema` member must carry `.meta({ id, title, ... })` so
 * the emitted JSON Schema can render its canonical TS type name in the
 * website's PropertyTable component.
 *
 * If this test fails after adding a new schema, add `.meta({ id, title,
 * description })` following the convention in `walkeros.ts` → `ConsentSchema`:
 *
 *   .meta({
 *     id: 'NamespacePascal',         // globally unique, PascalCase
 *     title: 'Namespace.Dotted',     // matches VS Code TS hover
 *     description: '…',
 *   })
 *
 * If a schema is intentionally anonymous (never surfaced to docs), add its
 * export name to `OPT_OUT` with a comment explaining why.
 */

/** Schemas intentionally excluded from meta coverage. */
const OPT_OUT: ReadonlySet<string> = new Set<string>([
  // Primitive wrappers in primitives.ts are tiny reusable building blocks
  // (RequiredString, Identifier, Timestamp, ...) not linked from docs.
  'RequiredString',
  'RequiredNumber',
  'RequiredBoolean',
  'Identifier',
  'Timestamp',
  'Counter',
  // Pattern primitives - URLs / emails / ids, not docs-facing.
  'HttpsUrl',
  'HttpUrl',
  'Email',
  'CssSelector',
  'SemVer',
  // Hint schemas live in hint.ts - flat key/value, not surfaced in PropertyTable.
  'CodeSchema',
  'HintSchema',
  'HintsSchema',
  // Marketing - flat click-id table entry, not linked from PropertyTable.
  'ClickIdEntrySchema',
  // Zod 4 limitation: schemas built via `.and()` composition
  // (UserSchema / SourceSchema) emit a collapsed `allOf`
  // without surfacing the wrapper's `.meta()` id/title to the JSON Schema
  // output. The meta is set on the schema for direct-reference cases, but
  // docs that render these via PropertyTable see `allOf` directly. Track as
  // a future Zod / JSON-schema toolchain follow-up.
  'UserSchema',
  'SourceSchema',
]);

/** Type guard - does `val` look like a Zod schema with usable meta? */
function isZodSchema(val: unknown): val is z.ZodTypeAny {
  if (val === null || typeof val !== 'object') return false;
  const candidate = val as { _zod?: unknown; parse?: unknown; meta?: unknown };
  // Zod 4 tags schemas with a `_zod` internal property and exposes `.parse()`
  // plus `.meta()` accessor.
  return (
    typeof candidate.parse === 'function' &&
    typeof candidate.meta === 'function'
  );
}

type JsonNode = {
  title?: unknown;
  $ref?: unknown;
  allOf?: Array<{ $ref?: unknown }>;
};

/** Extract the `#/definitions/<key>` target from a `$ref` or `allOf` node. */
function refKey(node: JsonNode | undefined): string | undefined {
  const ref =
    typeof node?.$ref === 'string' ? node.$ref : node?.allOf?.[0]?.$ref;
  if (typeof ref !== 'string') return undefined;
  return ref.match(/^#\/definitions\/(.+)$/)?.[1];
}

/**
 * Read the resolved meta ({ id, title }) the way the website's PropertyTable
 * consumes it: from emitted JSON Schema. The schema is wrapped in a parent
 * object so it emits as a `$ref` into `$defs`, where the `id` survives as the
 * definition key. Reading the top-level schema directly inlines it and drops
 * `id`, and the `.meta()` accessor loses `id` whenever a `.describe()` is
 * chained after `.meta()`, so neither is a reliable source on its own.
 *
 * Zod synthesises anonymous `__schemaN` definition keys for wrapper nodes
 * (e.g. a `.describe()` around a `.lazy()`), which forward to the real,
 * id-keyed definition via a nested `$ref`. We follow that indirection until we
 * reach a canonically keyed definition.
 */
function readMetaFromSchema(
  schema: z.ZodTypeAny,
): { id?: unknown; title?: unknown } | undefined {
  const wrapped = z.object({ value: schema });
  const json = z.toJSONSchema(wrapped, { target: 'draft-7' }) as {
    definitions?: Record<string, JsonNode>;
    properties?: { value?: JsonNode };
  };
  const definitions = json.definitions ?? {};

  let id = refKey(json.properties?.value);
  const seen = new Set<string>();
  while (id !== undefined && /^__schema\d+$/.test(id) && !seen.has(id)) {
    seen.add(id);
    id = refKey(definitions[id]);
  }
  if (id === undefined) return undefined;

  const def = definitions[id];
  if (!def) return undefined;
  return { id, title: def.title };
}

describe('Schema meta coverage', () => {
  const record = allSchemas as Record<string, unknown>;
  const candidates: Array<[string, z.ZodTypeAny]> = Object.entries(record)
    .filter(([name]) => !OPT_OUT.has(name))
    .filter((entry): entry is [string, z.ZodTypeAny] => {
      const [name, value] = entry;
      if (!name.endsWith('Schema')) return false;
      // Skip re-exports that alias schemas we test elsewhere - they share
      // the underlying Zod instance and inherit its meta.
      return isZodSchema(value);
    });

  test('at least one schema is covered (sanity)', () => {
    expect(candidates.length).toBeGreaterThan(10);
  });

  test.each(candidates)(
    '%s has a canonical .meta({ id, title })',
    (_name, schema) => {
      const meta = readMetaFromSchema(schema);
      expect(meta).toBeDefined();
      expect(typeof meta?.title).toBe('string');
      expect(typeof meta?.id).toBe('string');
      const title = meta?.title as string;
      const id = meta?.id as string;
      // Titles use dotted PascalCase (`Namespace.Something`) or a bare
      // PascalCase namespace (`Handler`, `Storage`).
      expect(title.length).toBeGreaterThan(0);
      // IDs are camelCase-free - PascalCase prefixed with a namespace.
      expect(id).toMatch(/^[A-Z][A-Za-z0-9]+$/);
    },
  );
});
