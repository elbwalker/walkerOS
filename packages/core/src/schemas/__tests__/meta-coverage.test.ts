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
  'TaggingVersion',
  // Pattern primitives — URLs / emails / ids, not docs-facing.
  'HttpsUrl',
  'HttpUrl',
  'Email',
  'CssSelector',
  'SemVer',
  // Hint schemas live in hint.ts — flat key/value, not surfaced in PropertyTable.
  'CodeSchema',
  'HintSchema',
  'HintsSchema',
  // Marketing — flat click-id table entry, not linked from PropertyTable.
  'ClickIdEntrySchema',
  // Zod 4 limitation: schemas built via `.and()` composition
  // (UserSchema / VersionSchema / SourceSchema) emit a collapsed `allOf`
  // without surfacing the wrapper's `.meta()` id/title to the JSON Schema
  // output. The meta is set on the schema for direct-reference cases, but
  // docs that render these via PropertyTable see `allOf` directly. Track as
  // a future Zod / JSON-schema toolchain follow-up.
  'UserSchema',
  'VersionSchema',
  'SourceSchema',
]);

/** Type guard — does `val` look like a Zod schema with usable meta? */
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

/**
 * Read the resolved meta ({ id, title, description }) from the emitted JSON
 * Schema. Reading from the JSON Schema (not the in-memory `.meta()` accessor)
 * is deliberate — it's what the website's PropertyTable actually consumes,
 * and it surfaces `id` correctly (the `.meta()` accessor does not).
 *
 * The emitted shape for a decorated top-level schema is either:
 *   Draft-7:     { allOf: [{$ref:'#/definitions/X'}], definitions: { X: {...} } }
 *   Draft-2020:  { $ref: '#/$defs/X', $defs: { X: {...} } }
 * We unwrap one level to reach the node carrying the id/title.
 */
function readMetaFromJsonSchema(
  schema: z.ZodTypeAny,
): { id?: unknown; title?: unknown } | undefined {
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<
    string,
    unknown
  >;
  const resolved = unwrapRef(json);
  if (!resolved || typeof resolved !== 'object') return undefined;
  const r = resolved as { id?: unknown; title?: unknown };
  if (r.id === undefined && r.title === undefined) return undefined;
  return r;
}

function unwrapRef(
  node: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const defs =
    (node.definitions as Record<string, Record<string, unknown>> | undefined) ??
    (node.$defs as Record<string, Record<string, unknown>> | undefined);
  const ref = (() => {
    if (typeof node.$ref === 'string') return node.$ref;
    if (Array.isArray(node.allOf)) {
      const first = node.allOf[0] as Record<string, unknown> | undefined;
      if (first && typeof first.$ref === 'string') return first.$ref;
    }
    return undefined;
  })();
  if (!ref || !defs) return node;
  const match = ref.match(/^#\/(?:definitions|\$defs)\/(.+)$/);
  if (!match) return node;
  return defs[match[1]];
}

describe('Schema meta coverage', () => {
  const record = allSchemas as Record<string, unknown>;
  const candidates: Array<[string, z.ZodTypeAny]> = Object.entries(record)
    .filter(([name]) => !OPT_OUT.has(name))
    .filter((entry): entry is [string, z.ZodTypeAny] => {
      const [name, value] = entry;
      if (!name.endsWith('Schema')) return false;
      // Skip re-exports that alias schemas we test elsewhere — they share
      // the underlying Zod instance and inherit its meta.
      return isZodSchema(value);
    });

  test('at least one schema is covered (sanity)', () => {
    expect(candidates.length).toBeGreaterThan(10);
  });

  test.each(candidates)(
    '%s has a canonical .meta({ id, title })',
    (_name, schema) => {
      const meta = readMetaFromJsonSchema(schema);
      expect(meta).toBeDefined();
      expect(typeof meta?.title).toBe('string');
      expect(typeof meta?.id).toBe('string');
      const title = meta?.title as string;
      const id = meta?.id as string;
      // Titles use dotted PascalCase (`Namespace.Something`) or a bare
      // PascalCase namespace (`Handler`, `Storage`).
      expect(title.length).toBeGreaterThan(0);
      // IDs are camelCase-free — PascalCase prefixed with a namespace.
      expect(id).toMatch(/^[A-Z][A-Za-z0-9]+$/);
    },
  );
});
