// walkerOS/packages/cli/src/commands/validate/validators/entry.ts

import Ajv from 'ajv';
import { fetchPackageSchema } from '@walkeros/core';
import type { ValidateResult, ValidationError } from '../types.js';

const SECTIONS = ['destinations', 'sources', 'transformers'] as const;

/**
 * Parse dot-notation path into [section, key].
 * If no section prefix, search all sections.
 */
function resolveEntry(
  path: string,
  flowConfig: Record<string, unknown>,
): { section: string; key: string; entry: Record<string, unknown> } | string {
  const flows = flowConfig.flows as Record<string, Record<string, unknown>>;
  if (!flows || typeof flows !== 'object') return 'No flows found in config';

  // Use first flow
  const flowName = Object.keys(flows)[0];
  const flow = flows[flowName];
  if (!flow) return `Flow "${flowName}" is empty`;

  const parts = path.split('.');

  if (parts.length === 2) {
    const [section, key] = parts;
    if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) {
      return `Unknown section "${section}". Must be one of: ${SECTIONS.join(', ')}`;
    }
    const sectionData = flow[section] as Record<string, unknown> | undefined;
    if (!sectionData || !(key in sectionData)) {
      return `Entry "${key}" not found in ${section}`;
    }
    return {
      section,
      key,
      entry: sectionData[key] as Record<string, unknown>,
    };
  }

  if (parts.length === 1) {
    const key = parts[0];
    const matches: { section: string; entry: Record<string, unknown> }[] = [];

    for (const section of SECTIONS) {
      const sectionData = flow[section] as Record<string, unknown> | undefined;
      if (sectionData && key in sectionData) {
        matches.push({
          section,
          entry: sectionData[key] as Record<string, unknown>,
        });
      }
    }

    if (matches.length === 0) {
      return `Entry "${key}" not found in any section`;
    }
    if (matches.length > 1) {
      const sections = matches.map((m) => m.section).join(', ');
      return `Ambiguous key "${key}" found in multiple sections: ${sections}. Use dot-notation (e.g., destinations.${key})`;
    }
    return { section: matches[0].section, key, entry: matches[0].entry };
  }

  return `Invalid path "${path}". Use "section.key" or just "key"`;
}

/**
 * Validate a specific entry (destination/source/transformer) in a flow config
 * against its package's published JSON Schema.
 */
export async function validateEntry(
  path: string,
  flowConfig: Record<string, unknown>,
): Promise<ValidateResult> {
  // Step 1: Resolve the entry
  const resolved = resolveEntry(path, flowConfig);
  if (typeof resolved === 'string') {
    return {
      valid: false,
      type: 'entry',
      errors: [{ path, message: resolved, code: 'ENTRY_VALIDATION' }],
      warnings: [],
      details: {},
    };
  }

  const { section, key, entry } = resolved;

  // Step 2: Check for package field
  const packageName = entry.package as string | undefined;
  if (!packageName) {
    return {
      valid: true,
      type: 'entry',
      errors: [],
      warnings: [],
      details: {
        section,
        key,
        skipped: true,
        reason: 'No package field — skipping remote schema validation',
      },
    };
  }

  // Step 3: Fetch schema from CDN
  let schemas: Record<string, unknown>;
  try {
    const info = await fetchPackageSchema(packageName);
    schemas = info.schemas;
  } catch (error) {
    return {
      valid: false,
      type: 'entry',
      errors: [
        {
          path,
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'ENTRY_VALIDATION',
        },
      ],
      warnings: [],
      details: { section, key, package: packageName },
    };
  }

  // Step 4: Validate settings against schema
  const settingsSchema = schemas?.settings;
  if (!settingsSchema) {
    return {
      valid: true,
      type: 'entry',
      errors: [],
      warnings: [],
      details: { section, key, note: 'Package has no settings schema' },
    };
  }

  const config = entry.config as Record<string, unknown> | undefined;
  const settings = config?.settings;

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(settingsSchema as object);
  const isValid = validate(settings || {});

  if (!isValid) {
    const errors: ValidationError[] = (validate.errors || []).map((e) => ({
      path: e.instancePath || '/',
      message: e.message || 'Unknown error',
      code: e.keyword,
    }));

    return {
      valid: false,
      type: 'entry',
      errors,
      warnings: [],
      details: { section, key, package: packageName },
    };
  }

  return {
    valid: true,
    type: 'entry',
    errors: [],
    warnings: [],
    details: { section, key, package: packageName },
  };
}
