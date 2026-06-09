// walkerOS/packages/cli/src/commands/bundle/structural-validators.ts
//
// Codegen-time structural validators, extracted so they can run on their own
// WITHOUT loading esbuild or fetching any package/archive. The bundler runs
// these before the esbuild compile; deploy preflight reuses them via
// `validateFlowStructure` for a sub-second config check.

import type { Flow } from '@walkeros/core';
import { isObject, validateStepEntry } from '@walkeros/core';

/**
 * Type guard to check if a code value is an InlineCode object.
 * InlineCode has { push: string, type?: string, init?: string }
 */
function isInlineCode(code: unknown): code is Flow.Code {
  return isObject(code) && 'push' in code;
}

/**
 * A reference carries inline code when it is an InlineCode object or (legacy)
 * a string. The string form is rejected downstream by validateStepEntry for
 * transformers, but is still treated as "has code" for the package XOR code
 * presence check on sources/destinations/stores.
 */
function hasCodeReference(code: unknown): boolean {
  return isInlineCode(code) || typeof code === 'string';
}

/**
 * Validates that a reference has either package XOR code, not both or neither.
 * Throws a descriptive error for invalid configurations.
 *
 * Transformers delegate to the closed-schema `validateStepEntry`; other kinds
 * keep the two-rule package/code presence check.
 */
export function validateReference(
  type: Flow.StepKind,
  name: string,
  ref: Flow.Step,
): void {
  if (type === 'Transformer') {
    const r = validateStepEntry({ ...ref }, 'Transformer');
    if (!r.ok) {
      throw new Error(`Transformer "${name}": ${r.reason ?? 'invalid entry.'}`);
    }
    return;
  }
  // Sources / Destinations / Stores keep their existing two-rule check.
  // The conflict check uses hasCodeReference so the bare string `code`
  // form is also rejected when combined with a package, matching the
  // presence check below.
  const hasPackage = !!ref.package;
  const hasCode = hasCodeReference(ref.code);
  if (hasPackage && hasCode) {
    throw new Error(
      `${type} "${name}": Cannot specify both package and code. Use one or the other.`,
    );
  }
  if (!hasPackage && !hasCode) {
    throw new Error(`${type} "${name}": Must specify either package or code.`);
  }
}

const VALID_JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Validates that component names are valid JavaScript identifiers.
 * The bundler generates JS where flow config keys become property names,
 * so keys like "gtag-wrapper" would cause esbuild syntax errors.
 * Catches this early with a helpful error message suggesting camelCase.
 */
export function validateComponentNames(
  components: Record<string, unknown>,
  section: string,
): void {
  for (const name of Object.keys(components)) {
    if (!VALID_JS_IDENTIFIER.test(name)) {
      throw new Error(
        `Invalid ${section} name "${name}": must be a valid JavaScript identifier (use camelCase, e.g., "${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}")`,
      );
    }
  }
}

/**
 * Validates all $store. references point to defined stores.
 * Throws descriptive error on mismatch.
 */
export function validateStoreReferences(
  flowSettings: Flow,
  storeIds: Set<string>,
): void {
  const refs: Array<{ ref: string; location: string }> = [];

  function collectRefs(obj: unknown, path: string) {
    if (typeof obj === 'string' && obj.startsWith('$store.')) {
      refs.push({ ref: obj.slice(7), location: path });
      return;
    }
    if (obj === null || typeof obj !== 'object') return;
    // Boundary: walker traverses arbitrary JSON. After typeof === 'object'
    // narrowing, indexing as a Record<string, unknown> is the typed way
    // to enumerate keys.
    for (const [key, val] of Object.entries(obj)) {
      collectRefs(val, `${path}.${key}`);
    }
  }

  // Scan all component env/config values
  const sectionMap = {
    sources: flowSettings.sources || {},
    destinations: flowSettings.destinations || {},
    transformers: flowSettings.transformers || {},
  };
  for (const [section, components] of Object.entries(sectionMap)) {
    for (const [id, component] of Object.entries(components)) {
      collectRefs(component, `${section}.${id}`);
    }
  }

  const missing = refs.filter(({ ref }) => !storeIds.has(ref));
  if (missing.length > 0) {
    const available =
      storeIds.size > 0
        ? `Available stores: ${Array.from(storeIds).join(', ')}`
        : 'No stores defined';
    const details = missing
      .map(
        ({ ref, location }) =>
          `"$store.${ref}" in ${location} (store "${ref}" not found)`,
      )
      .join('; ');
    throw new Error(`Invalid store references: ${details}. ${available}`);
  }
}
