// walkerOS/packages/cli/src/commands/validate/validators/settings.ts

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { Flow } from '@walkeros/core';
import {
  createLogger,
  ENV_MARKER_PREFIX,
  getErrorMessage,
  isObject,
  REF_CODE_PREFIX,
  REF_STORE,
  SECRET_MARKER_PREFIX,
} from '@walkeros/core';
import {
  resolveExportName,
  type ComponentKind,
} from '../../../core/resolve-export-name.js';
import {
  resolveStepPackage,
  type ResolvedStepPackage,
} from '../../../core/step-packages.js';
import { readStepPackageInfo } from '../../../core/package-info.js';
import type { EntrySection } from '../scope.js';
import type {
  ValidateCheck,
  ValidateDeferred,
  ValidateSkip,
  ValidationError,
} from '../types.js';

// __VERSION__ is replaced at build time by tsup's `define` (see tsup.config.ts).
// In tests, it's set as a global by the shared jest config (@walkeros/config/jest).
declare const __VERSION__: string;

const CLIENT_HEADER = 'walkeros-cli/' + __VERSION__;

// Resolving a step's package logs only a warning (a bundle pin over a
// disagreeing inline version); the version checked is in details.packages.
const LOGGER = createLogger();

/** One step whose settings are checked against its package schema. */
export interface SettingsTarget {
  flow: string;
  section: EntrySection;
  key: string;
  /** The step as written in the file (package, bundle pins). */
  entry: Record<string, unknown>;
}

export interface SettingsContext {
  /** Directory a local `path` package resolves against; unset: no disk reads. */
  configDir?: string;
  /** Schemas fetched in this run, by package source. */
  cache: Map<string, Promise<PackageSchema>>;
  /** Settings validators compiled in this run, by package source and export. */
  compiled: Map<string, CompiledSettings | undefined>;
}

export interface CheckedPackage {
  path: string;
  package: string;
  version?: string;
}

export interface SettingsOutcome {
  findings: ValidationError[];
  skipped: ValidateSkip[];
  deferred: ValidateDeferred[];
  checked?: CheckedPackage;
}

export interface PackageSchema {
  version?: string;
  /** The default export's settings schema. */
  settings: unknown;
  /** Schemas per export, keyed by export name (multi-export packages). */
  exportSchemas?: Record<string, unknown>;
  /** Export names the package declares. */
  exports?: string[];
}

export type SettingsSelection =
  | { ok: true; settings: unknown }
  | { ok: false; reason: string };

/** A settings schema compiled once per package source, export and run. */
type CompiledSettings =
  | { ok: true; validate: ValidateFunction }
  | { ok: false; message: string };

export function createSettingsContext(configDir?: string): SettingsContext {
  return { configDir, cache: new Map(), compiled: new Map() };
}

/**
 * The settings schema for the export a step imports, by the same rule
 * simulate uses for dev examples: no export named takes `settings`; a
 * per-export map takes that export's entry and never another export's; a
 * package declaring at most one export takes `settings` for its only step
 * export; a multi-export package without a map, or a package that does not
 * publish its exports, cannot be checked.
 */
export function selectSettingsSchema(
  pkg: PackageSchema,
  packageLabel: string,
  exportName: string | undefined,
): SettingsSelection {
  if (exportName === undefined) return { ok: true, settings: pkg.settings };
  if (pkg.exportSchemas) {
    const entry = Object.prototype.hasOwnProperty.call(
      pkg.exportSchemas,
      exportName,
    )
      ? pkg.exportSchemas[exportName]
      : undefined;
    if (!isObject(entry))
      return {
        ok: false,
        reason: `${packageLabel} has no export "${exportName}"`,
      };
    return { ok: true, settings: entry.settings };
  }
  if (pkg.exports && pkg.exports.length < 2)
    return { ok: true, settings: pkg.settings };
  return {
    ok: false,
    reason: `${packageLabel} predates per-export settings schemas; the step imports "${exportName}"`,
  };
}

const SECTION_KIND: Record<EntrySection, ComponentKind> = {
  sources: 'source',
  transformers: 'transformer',
  destinations: 'destination',
  stores: 'store',
};

/** Segments of an Ajv instance path (a JSON pointer). */
function pointerSegments(pointer: string): string[] {
  if (pointer === '') return [];
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function valueAt(root: unknown, segments: string[]): unknown {
  let current = root;
  for (const segment of segments) {
    if (Array.isArray(current)) current = current[Number(segment)];
    else if (isObject(current)) current = current[segment];
    else return undefined;
  }
  return current;
}

// The bundler's deferred-$env marker grammar (see bundle/bundler.ts): a
// default runs until whitespace, a quote or the next marker.
const MARKER = ENV_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ENV_MARKER = new RegExp(
  `${MARKER}([a-zA-Z_][a-zA-Z0-9_]*)(?::((?:(?!${MARKER})[^\\s"'])*))?`,
  'g',
);

interface PreparedSettings {
  value: unknown;
  /** Instance paths known only at runtime, with the reference as written. */
  deferred: Array<{ segments: string[]; reference: string }>;
}

/**
 * The placeholder rule, applied to settings already resolved by
 * `getFlowSettings(..., { deferred: true })`: `$var` and `$flow` values are
 * already resolved (an unresolvable one fails the flow first); `$env.NAME:default`
 * is checked as its default; `$env.NAME` without default, `$secret`, `$store`
 * and `$code` are known only at runtime and deferred.
 */
function prepareSettings(settings: unknown): PreparedSettings {
  const deferred: PreparedSettings['deferred'] = [];
  const walk = (value: unknown, segments: string[]): unknown => {
    if (Array.isArray(value))
      return value.map((item, index) => walk(item, [...segments, `${index}`]));
    if (isObject(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          walk(item, [...segments, key]),
        ]),
      );
    if (typeof value !== 'string') return value;

    if (value.startsWith(SECRET_MARKER_PREFIX)) {
      deferred.push({
        segments,
        reference: `$secret.${value.slice(SECRET_MARKER_PREFIX.length)}`,
      });
      return value;
    }
    if (value.includes(ENV_MARKER_PREFIX)) {
      let runtimeOnly = false;
      const withDefaults = value.replace(
        ENV_MARKER,
        (_match, _name: string, fallback: string | undefined) => {
          if (fallback === undefined) runtimeOnly = true;
          return fallback ?? '';
        },
      );
      if (!runtimeOnly) return withDefaults;
      deferred.push({
        segments,
        reference: value.replace(
          ENV_MARKER,
          (_match, name: string, fallback: string | undefined) =>
            fallback === undefined
              ? `$env.${name}`
              : `$env.${name}:${fallback}`,
        ),
      });
      return value;
    }
    if (REF_STORE.test(value) || value.startsWith(REF_CODE_PREFIX)) {
      deferred.push({ segments, reference: value });
    }
    return value;
  };
  return { value: walk(settings, []), deferred };
}

function isUnder(segments: string[], prefix: string[]): boolean {
  return prefix.every((segment, index) => segments[index] === segment);
}

async function loadSchema(
  resolved: ResolvedStepPackage,
  context: SettingsContext,
): Promise<PackageSchema> {
  const info = await readStepPackageInfo(resolved, {
    configDir: context.configDir,
    client: CLIENT_HEADER,
  });
  return {
    version: info.version,
    settings: info.schemas.settings,
    ...(info.exportSchemas ? { exportSchemas: info.exportSchemas } : {}),
    ...(info.exports ? { exports: Object.keys(info.exports) } : {}),
  };
}

/**
 * Compile a package's settings schema. A schema Ajv cannot compile (an
 * unknown keyword, a bad `$ref`) cannot be checked against, so it is a
 * failed compile the caller reports as a skip, never a crash of the run.
 */
function compileSettings(settings: unknown): CompiledSettings | undefined {
  if (!isObject(settings)) return undefined;
  // Formats such as `uri` and `email` are not bundled with Ajv; ignore them
  // instead of failing to compile. Every structural keyword is still checked.
  const ajv = new Ajv({ allErrors: true, validateFormats: false });
  try {
    return { ok: true, validate: ajv.compile(settings) };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

function sourceKey({ packageName, spec }: ResolvedStepPackage): string {
  return spec.path !== undefined
    ? `path:${spec.path}`
    : `${packageName}@${spec.version ?? 'latest'}`;
}

function cachedSchema(
  resolved: ResolvedStepPackage,
  context: SettingsContext,
): Promise<PackageSchema> {
  const key = sourceKey(resolved);
  let pending = context.cache.get(key);
  if (!pending) {
    pending = loadSchema(resolved, context);
    context.cache.set(key, pending);
  }
  return pending;
}

function cachedCompile(
  resolved: ResolvedStepPackage,
  exportName: string | undefined,
  settings: unknown,
  context: SettingsContext,
): CompiledSettings | undefined {
  const key = `${sourceKey(resolved)}#${exportName ?? ''}`;
  if (context.compiled.has(key)) return context.compiled.get(key);
  const compiled = compileSettings(settings);
  context.compiled.set(key, compiled);
  return compiled;
}

/**
 * Check one step's resolved `config.settings` against its package's
 * settings schema, at the version the bundle would install. Findings are
 * returned for the caller to report as errors or warnings; a check that
 * cannot run is a skip; values known only at runtime are deferred.
 */
export async function checkStepSettings(
  target: SettingsTarget,
  resolvedFlow: Flow,
  check: ValidateCheck,
  context: SettingsContext,
): Promise<SettingsOutcome> {
  const at = `flows.${target.flow}.${target.section}.${target.key}`;
  const outcome: SettingsOutcome = { findings: [], skipped: [], deferred: [] };
  const spec =
    typeof target.entry.package === 'string' ? target.entry.package : '';
  if (!spec) {
    outcome.skipped.push({
      path: at,
      check,
      reason: 'No package field, so there is no settings schema to fetch',
      code: 'NO_PACKAGE',
    });
    return outcome;
  }

  // The package source the bundle would install for this step.
  let resolved: ResolvedStepPackage;
  try {
    resolved = resolveStepPackage(
      resolvedFlow,
      SECTION_KIND[target.section],
      target.key,
      LOGGER,
    );
  } catch (error) {
    outcome.skipped.push({
      path: at,
      check,
      reason: `Schema for ${spec} could not be loaded: ${getErrorMessage(error)}`,
      code: 'SCHEMA_UNAVAILABLE',
    });
    return outcome;
  }
  const { label } = resolved;
  const pinned =
    resolved.spec.path === undefined ? resolved.spec.version : undefined;

  let schema: PackageSchema;
  try {
    schema = await cachedSchema(resolved, context);
  } catch (error) {
    outcome.skipped.push({
      path: at,
      check,
      reason: `Schema for ${label}${pinned ? `@${pinned}` : ''} could not be loaded: ${getErrorMessage(error)}`,
      code: 'SCHEMA_UNAVAILABLE',
    });
    return outcome;
  }
  outcome.checked = {
    path: at,
    package: label,
    ...(schema.version ? { version: schema.version } : {}),
  };

  // The export the step imports, resolved as the bundler resolves it.
  const { exportName } = resolveExportName(
    resolved.normalizedFlow,
    SECTION_KIND[target.section],
    target.key,
  );
  const version = schema.version ?? pinned;
  const selection = selectSettingsSchema(
    schema,
    version ? `${label}@${version}` : label,
    exportName,
  );
  if (!selection.ok) {
    outcome.skipped.push({
      path: at,
      check,
      reason: selection.reason,
      code: 'NO_SETTINGS_SCHEMA',
    });
    return outcome;
  }

  const compiled = cachedCompile(
    resolved,
    exportName,
    selection.settings,
    context,
  );
  if (!compiled) {
    outcome.skipped.push({
      path: at,
      check,
      reason: `Package ${label} has no settings schema`,
      code: 'NO_SETTINGS_SCHEMA',
    });
    return outcome;
  }
  if (!compiled.ok) {
    outcome.skipped.push({
      path: at,
      check,
      reason: `The settings schema of ${label} cannot be compiled: ${compiled.message}`,
      code: 'SCHEMA_UNAVAILABLE',
    });
    return outcome;
  }
  const validate = compiled.validate;

  const step = stepOf(resolvedFlow, target.section, target.key);
  const config = isObject(step?.config) ? step.config : {};
  const prepared = prepareSettings(config.settings ?? {});
  const base = `${at}.config.settings`;
  for (const { segments, reference } of prepared.deferred) {
    outcome.deferred.push({
      path: [base, ...segments].join('.'),
      reference,
    });
  }

  if (validate(prepared.value)) return outcome;

  for (const e of validate.errors || []) {
    const segments = pointerSegments(e.instancePath);
    if (prepared.deferred.some((d) => isUnder(segments, d.segments))) continue;
    const finding: ValidationError = {
      path: [base, ...segments].join('.'),
      message: describeAjvError(e),
      code: 'ENTRY_SCHEMA',
      keyword: e.keyword,
    };
    if (segments.length > 0) finding.value = valueAt(prepared.value, segments);
    outcome.findings.push(finding);
  }
  return outcome;
}

/** Ajv's message, naming the offending key where Ajv only reports it in params. */
function describeAjvError(error: ErrorObject): string {
  const message = error.message || 'Unknown error';
  const extra: unknown = error.params.additionalProperty;
  return error.keyword === 'additionalProperties' && typeof extra === 'string'
    ? `${message}: "${extra}"`
    : message;
}

function stepOf(
  flow: Flow,
  section: EntrySection,
  key: string,
): Flow.Step | undefined {
  switch (section) {
    case 'sources':
      return flow.sources?.[key];
    case 'destinations':
      return flow.destinations?.[key];
    case 'transformers':
      return flow.transformers?.[key];
    case 'stores':
      return flow.stores?.[key];
  }
}
