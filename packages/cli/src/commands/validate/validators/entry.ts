// walkerOS/packages/cli/src/commands/validate/validators/entry.ts

import Ajv from 'ajv';
import { fetchPackageSchema, isObject } from '@walkeros/core';
import { describeScope, resolveScope, type ScopeEntry } from '../scope.js';
import type {
  ValidateResult,
  ValidateSkip,
  ValidationError,
} from '../types.js';

// __VERSION__ is replaced at build time by tsup's `define` (see tsup.config.ts).
// In tests, it's set as a global by the shared jest config (@walkeros/config/jest).
declare const __VERSION__: string;

const CLIENT_HEADER = 'walkeros-cli/' + __VERSION__;

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

interface EntryPackage {
  path: string;
  package: string;
}

/**
 * Check one entry's `config.settings` against its package's published
 * settings schema. Findings are errors; a check that cannot run is a skip.
 */
async function checkEntrySettings(
  target: ScopeEntry,
  errors: ValidationError[],
  skipped: ValidateSkip[],
  packages: EntryPackage[],
): Promise<void> {
  const at = `flows.${target.flow}.${target.section}.${target.key}`;
  const packageName =
    typeof target.entry.package === 'string' ? target.entry.package : '';
  if (!packageName) {
    skipped.push({
      path: at,
      check: 'entry:settings',
      reason: 'No package field, so there is no settings schema to fetch',
      code: 'NO_PACKAGE',
    });
    return;
  }
  packages.push({ path: at, package: packageName });

  let settingsSchema: unknown;
  try {
    const info = await fetchPackageSchema(packageName, {
      client: CLIENT_HEADER,
    });
    settingsSchema = info.schemas?.settings;
  } catch (error) {
    skipped.push({
      path: at,
      check: 'entry:settings',
      reason: `Schema for ${packageName} could not be fetched: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'SCHEMA_UNAVAILABLE',
    });
    return;
  }

  if (!isObject(settingsSchema)) {
    skipped.push({
      path: at,
      check: 'entry:settings',
      reason: `Package ${packageName} has no settings schema`,
      code: 'NO_SETTINGS_SCHEMA',
    });
    return;
  }

  const config = isObject(target.entry.config) ? target.entry.config : {};
  const settings = config.settings ?? {};

  // Formats such as `uri` and `email` are not bundled with Ajv; ignore them
  // instead of failing to compile. Every structural keyword is still checked.
  const ajv = new Ajv({ allErrors: true, validateFormats: false });
  const validate = ajv.compile(settingsSchema);
  if (validate(settings)) return;

  for (const e of validate.errors || []) {
    const segments = pointerSegments(e.instancePath);
    const error: ValidationError = {
      path: [`${at}.config.settings`, ...segments].join('.'),
      message: e.message || 'Unknown error',
      code: 'ENTRY_SCHEMA',
      keyword: e.keyword,
    };
    if (segments.length > 0) error.value = valueAt(settings, segments);
    errors.push(error);
  }
}

/**
 * Validate an entry (source, destination, transformer or store) addressed by
 * `path` (`section.key` or `key`) against its package's published JSON
 * Schema, in every flow that has it, or only in `options.flow`.
 */
export async function validateEntry(
  path: string,
  flowConfig: unknown,
  options: { flow?: string } = {},
): Promise<ValidateResult> {
  const resolved = resolveScope(flowConfig, { flow: options.flow, path });
  const errors: ValidationError[] = [...resolved.errors];
  const skipped: ValidateSkip[] = [];
  const packages: EntryPackage[] = [];

  for (const target of resolved.entries) {
    await checkEntrySettings(target, errors, skipped, packages);
  }

  return {
    valid: errors.length === 0,
    type: 'entry',
    errors,
    warnings: [],
    details: {
      scope: describeScope(resolved, ['entry:settings']),
      skipped,
      ...(packages.length > 0 ? { packages } : {}),
    },
  };
}
