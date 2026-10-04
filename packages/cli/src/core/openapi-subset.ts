import { createHash } from 'node:crypto';

/**
 * The client subset of the app's OpenAPI document: the operations a walkerOS
 * client calls (listed in `openapi/client-operations.json`), the components
 * they reference, and nothing that only documents them.
 *
 * Imports only `node:crypto` and uses erasable TypeScript only, so plain
 * `node` runs this file without a build (`scripts/generate-client-spec.mjs`
 * and the release checks import it directly).
 */

type JsonObject = { [key: string]: unknown };

const HTTP_METHODS: ReadonlySet<string> = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

/**
 * Keywords that only document. Stripped wherever they are keywords; `tags`
 * groups operations for documentation and never reaches the wire.
 */
const DOC_KEYWORDS: ReadonlySet<string> = new Set([
  'description',
  'summary',
  'title',
  'example',
  'examples',
  'externalDocs',
  'tags',
]);

/** Keywords whose value is data, never a document node: kept verbatim. */
const VERBATIM_KEYWORDS: ReadonlySet<string> = new Set([
  'enum',
  'const',
  'default',
  'required',
  'security',
  'mapping',
  'scopes',
]);

/**
 * Keywords whose value maps NAMES to nodes: a property, a status code, a
 * media type, a component. The names are never keywords, so a property named
 * `description` survives.
 */
const NAME_MAPS: ReadonlySet<string> = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
  'paths',
  'webhooks',
  'schemas',
  'responses',
  'parameters',
  'requestBodies',
  'headers',
  'securitySchemes',
  'links',
  'callbacks',
  'pathItems',
  'content',
  'encoding',
  'variables',
]);

/** Top-level keys a client subset does not carry. */
const DROPPED_TOP_LEVEL: ReadonlySet<string> = new Set([
  'tags',
  'webhooks',
  'externalDocs',
]);

const NOTHING_KEPT: ReadonlySet<string> = new Set();

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isVerbatim(key: string): boolean {
  return VERBATIM_KEYWORDS.has(key) || key.startsWith('x-');
}

/**
 * Recursively order object keys so equal documents serialize byte-identically
 * regardless of key order. Arrays keep their order. Identical to the app's
 * `canonicalize` (app/src/lib/api/contract-version.ts).
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    const result: JsonObject = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key]);
    }
    return result;
  }
  return value;
}

/** `"<METHOD> <path>"` split into the lowercase method key and the path. */
export function parseOperation(op: string): { method: string; path: string } {
  const space = op.indexOf(' ');
  const method = space > 0 ? op.slice(0, space).toLowerCase() : '';
  const path = op.slice(space + 1);
  if (!HTTP_METHODS.has(method) || !path.startsWith('/')) {
    throw new Error(`invalid operation: ${op}`);
  }
  return { method, path };
}

/** One entry of `client-operations.json`. */
export interface ManifestEntry {
  /** `"<METHOD> <path template>"`. */
  op: string;
  /** The commands, tools and exports that call it. */
  usedBy: string[];
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/**
 * The entries of a parsed `client-operations.json`: a list of
 * `{ op, usedBy }`. Throws on any other shape.
 */
export function manifestEntries(manifest: unknown): ManifestEntry[] {
  if (!Array.isArray(manifest)) {
    throw new Error('client operations manifest is not a list');
  }
  return manifest.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.op !== 'string' ||
      !isStringList(entry.usedBy)
    ) {
      throw new Error(
        `client operations manifest entry is not { op, usedBy }: ${JSON.stringify(entry)}`,
      );
    }
    parseOperation(entry.op);
    return { op: entry.op, usedBy: entry.usedBy };
  });
}

/** The `op` of every entry of a parsed `client-operations.json`. */
export function manifestOperations(manifest: unknown): string[] {
  return manifestEntries(manifest).map((entry) => entry.op);
}

/** Every `"<METHOD> <path>"` a document declares, in document order. */
export function documentOperations(doc: unknown): string[] {
  const paths = isRecord(doc) && isRecord(doc.paths) ? doc.paths : {};
  const operations: string[] = [];
  for (const [path, item] of Object.entries(paths)) {
    if (!isRecord(item)) continue;
    for (const key of Object.keys(item)) {
      if (HTTP_METHODS.has(key))
        operations.push(`${key.toUpperCase()} ${path}`);
    }
  }
  return operations;
}

function hasOperation(doc: unknown, op: string): boolean {
  const { method, path } = parseOperation(op);
  if (!isRecord(doc) || !isRecord(doc.paths)) return false;
  const item = doc.paths[path];
  return isRecord(item) && isRecord(item[method]);
}

function stripNode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripNode);
  if (!isRecord(node)) return node;
  return stripObject(node, NOTHING_KEPT);
}

function stripObject(node: JsonObject, kept: ReadonlySet<string>): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (kept.has(key) || isVerbatim(key)) out[key] = value;
    else if (DOC_KEYWORDS.has(key)) continue;
    else if (NAME_MAPS.has(key) && isRecord(value)) {
      out[key] = stripNameMap(value, key === 'responses');
    } else out[key] = stripNode(value);
  }
  return out;
}

function stripNameMap(map: JsonObject, responses: boolean): JsonObject {
  const out: JsonObject = {};
  for (const [name, node] of Object.entries(map)) {
    out[name] = responses ? stripResponse(node) : stripNode(node);
  }
  return out;
}

/** OpenAPI requires a Response object's `description`; it stays, emptied. */
function stripResponse(node: unknown): unknown {
  if (!isRecord(node) || typeof node.$ref === 'string') return stripNode(node);
  return { description: '', ...stripObject(node, NOTHING_KEPT) };
}

/** The whole document with doc keywords stripped; `info` keeps its title. */
function stripDocument(doc: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(doc)) {
    if (DROPPED_TOP_LEVEL.has(key)) continue;
    if (key === 'info' && isRecord(value)) {
      out.info = stripObject(value, new Set(['title', 'version']));
    } else if (isVerbatim(key)) out[key] = value;
    else if (NAME_MAPS.has(key) && isRecord(value)) {
      out[key] = stripNameMap(value, false);
    } else out[key] = stripNode(value);
  }
  return out;
}

/**
 * Every `$ref` and discriminator mapping target under a node. Walked by
 * structure like the stripping: the keys of a name map are names, never
 * keywords, so a property named `default` or `mapping` is a schema.
 */
function collectRefs(node: unknown, refs: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') refs.add(value);
    else if (NAME_MAPS.has(key) && isRecord(value)) {
      for (const named of Object.values(value)) collectRefs(named, refs);
    } else if (key === 'discriminator' && isRecord(value)) {
      const mapping = isRecord(value.mapping) ? value.mapping : {};
      for (const target of Object.values(mapping)) {
        if (typeof target === 'string') refs.add(target);
      }
    } else if (!isVerbatim(key)) collectRefs(value, refs);
  }
}

/** `#/components/<section>/<name>` as its section and name. */
function componentOf(ref: string): { section: string; name: string } {
  const parts = ref.startsWith('#/')
    ? ref
        .slice(2)
        .split('/')
        .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    : [];
  if (parts.length < 3 || parts[0] !== 'components') {
    throw new Error(`unsupported $ref: ${ref}`);
  }
  return { section: parts[1], name: parts[2] };
}

function pruneComponents(
  components: JsonObject,
  roots: unknown[],
): JsonObject | undefined {
  const referenced = new Map<string, Set<string>>();
  const pending: string[] = [];
  const queue = (node: unknown): void => {
    const refs = new Set<string>();
    collectRefs(node, refs);
    pending.push(...refs);
  };
  for (const root of roots) queue(root);
  if (isRecord(components.securitySchemes)) queue(components.securitySchemes);

  for (let ref = pending.pop(); ref !== undefined; ref = pending.pop()) {
    const { section, name } = componentOf(ref);
    const names = referenced.get(section) ?? new Set<string>();
    if (names.has(name)) continue;
    const entries = components[section];
    if (!isRecord(entries) || !(name in entries)) {
      throw new Error(`$ref target not in input: ${ref}`);
    }
    names.add(name);
    referenced.set(section, names);
    queue(entries[name]);
  }

  const out: JsonObject = {};
  for (const [section, entries] of Object.entries(components)) {
    if (!isRecord(entries)) continue;
    if (section === 'securitySchemes') {
      out[section] = entries;
      continue;
    }
    const names = referenced.get(section);
    if (!names) continue;
    const kept: JsonObject = {};
    for (const [name, node] of Object.entries(entries)) {
      if (names.has(name)) kept[name] = node;
    }
    out[section] = kept;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * The client subset of an OpenAPI document: exactly `ops` (each with its
 * path-level parameters), the components they reach through `$ref`, and the
 * security schemes, with every documentation keyword stripped. A Response
 * object keeps `description: ''`; `info` keeps `title` and `version`. The
 * top-level `tags`, `webhooks` and `externalDocs` are dropped.
 *
 * Throws `manifest operation not in input: <op>` for an operation the
 * document lacks. Pruning a pruned document changes nothing.
 */
export function pruneToOperations(
  doc: unknown,
  ops: readonly string[],
): JsonObject {
  if (!isRecord(doc) || !isRecord(doc.paths)) {
    throw new Error('input is not an OpenAPI document with paths');
  }
  for (const op of ops) {
    if (!hasOperation(doc, op)) {
      throw new Error(`manifest operation not in input: ${op}`);
    }
  }

  const listed = new Set(
    ops.map((op) => {
      const { method, path } = parseOperation(op);
      return `${method} ${path}`;
    }),
  );
  const stripped = stripDocument(doc);
  const allPaths = isRecord(stripped.paths) ? stripped.paths : {};

  const paths: JsonObject = {};
  for (const [path, item] of Object.entries(allPaths)) {
    if (!isRecord(item)) continue;
    const kept: JsonObject = {};
    let operations = 0;
    for (const [key, value] of Object.entries(item)) {
      if (!HTTP_METHODS.has(key)) kept[key] = value;
      else if (listed.has(`${key} ${path}`)) {
        kept[key] = value;
        operations += 1;
      }
    }
    if (operations > 0) paths[path] = kept;
  }

  const out: JsonObject = {};
  const roots: unknown[] = [];
  for (const [key, value] of Object.entries(stripped)) {
    if (key === 'components') continue;
    out[key] = key === 'paths' ? paths : value;
    roots.push(out[key]);
  }
  if (isRecord(stripped.components)) {
    const components = pruneComponents(stripped.components, roots);
    if (components) out.components = components;
  }
  return out;
}

/** The component a `$ref` names, inside a pruned document. */
function resolveRef(doc: JsonObject, ref: string): unknown {
  const { section, name } = componentOf(ref);
  const components = isRecord(doc.components) ? doc.components : {};
  const entries = components[section];
  return isRecord(entries) ? entries[name] : undefined;
}

/**
 * A node with every `$ref` replaced by its target, except a cycle's. Walked
 * by structure like {@link collectRefs}: the keys of a name map are names.
 */
function inlineRefs(
  node: unknown,
  doc: JsonObject,
  stack: readonly string[],
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => inlineRefs(item, doc, stack));
  }
  if (!isRecord(node)) return node;
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && !stack.includes(value)) {
      out[key] = inlineRefs(resolveRef(doc, value), doc, [...stack, value]);
    } else if (key === '$ref') out[key] = value;
    else if (NAME_MAPS.has(key) && isRecord(value)) {
      const named: JsonObject = {};
      for (const [name, child] of Object.entries(value)) {
        named[name] = inlineRefs(child, doc, stack);
      }
      out[key] = named;
    } else if (isVerbatim(key)) out[key] = value;
    else out[key] = inlineRefs(value, doc, stack);
  }
  return out;
}

/**
 * A wire digest per operation: the sha256 hex of the canonical operation
 * subtree (its path-level parameters and the operation) of the client subset,
 * with every `$ref` inlined. A `$ref` already on the current inlining path
 * stays a `$ref`. Canonicalized like {@link canonicalize}, so documentation
 * changes leave a digest equal and a wire change in a referenced schema
 * changes the digest of exactly the operations that reach it.
 *
 * Operations the document lacks are absent from the result.
 */
export function operationDigests(
  doc: unknown,
  ops: readonly string[],
): Record<string, string> {
  const present = ops.filter((op) => hasOperation(doc, op));
  const pruned = pruneToOperations(doc, present);
  const paths = isRecord(pruned.paths) ? pruned.paths : {};
  const digests: Record<string, string> = {};
  for (const op of present) {
    const { method, path } = parseOperation(op);
    const item = paths[path];
    if (!isRecord(item)) continue;
    const subtree = inlineRefs(
      { pathParameters: item.parameters ?? [], operation: item[method] },
      pruned,
      [],
    );
    digests[op] = createHash('sha256')
      .update(JSON.stringify(canonicalize(subtree)))
      .digest('hex');
  }
  return digests;
}

/** A contract label's floor: its version without the build metadata. */
interface Floor {
  core: [number, number, number];
  prerelease: string[];
}

function parseFloor(label: string): Floor {
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
      label,
    );
  if (!match) throw new Error(`invalid contract label: ${label}`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

/** Semver precedence of two floors: negative when `a` is the lower one. */
function compareFloors(a: Floor, b: Floor): number {
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] !== b.core[i]) return a.core[i] - b.core[i];
  }
  // A release ranks above any prerelease of the same version.
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return b.prerelease.length - a.prerelease.length;
  }
  const length = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) - Number(y);
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return a.prerelease.length - b.prerelease.length;
}

/**
 * Whether the contract label's floor dropped from `base` to `head`. A label
 * is `<floor>+<hash8>`, and the floor orders labels the way semver does,
 * ignoring the build metadata. A base without build metadata is a
 * release-line label that names no floor, so nothing is ordered against it.
 * Throws `invalid contract label: <label>` for a label that is not a version.
 */
export function labelFloorRegressed(base: string, head: string): boolean {
  if (!base.includes('+')) return false;
  return compareFloors(parseFloor(head), parseFloor(base)) < 0;
}

function labelOf(doc: unknown): string | undefined {
  return isRecord(doc) &&
    isRecord(doc.info) &&
    typeof doc.info.version === 'string'
    ? doc.info.version
    : undefined;
}

function withoutLabel(doc: JsonObject): JsonObject {
  if (!isRecord(doc.info)) return doc;
  const { version: _version, ...info } = doc.info;
  return { ...doc, info };
}

/** Whether two labels name the same floor; a label without one names none. */
function sameFloor(previous: string, next: string): boolean {
  if (previous === next) return true;
  if (!previous.includes('+') || !next.includes('+')) return false;
  return compareFloors(parseFloor(previous), parseFloor(next)) === 0;
}

/**
 * Whether a freshly pruned client subset leaves the previous one as it is:
 * equal apart from `info.version`, with labels of the same floor. An app
 * change no client operation sees then keeps the committed subset, and its
 * label stays the app label of the last client-visible change.
 */
export function subsetUnchanged(previous: unknown, next: unknown): boolean {
  if (!isRecord(previous) || !isRecord(next)) return false;
  const previousLabel = labelOf(previous);
  const nextLabel = labelOf(next);
  if (previousLabel === undefined || nextLabel === undefined) return false;
  if (!sameFloor(previousLabel, nextLabel)) return false;
  return (
    JSON.stringify(canonicalize(withoutLabel(previous))) ===
    JSON.stringify(canonicalize(withoutLabel(next)))
  );
}
