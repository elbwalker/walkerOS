// walkerOS/packages/cli/src/commands/validate/scope.ts

import { isObject } from '@walkeros/core';
import type { ValidateCheck, ValidateScope, ValidationError } from './types.js';

/** Step sections a `--path` can address. */
export const ENTRY_SECTIONS = [
  'sources',
  'destinations',
  'transformers',
  'stores',
] as const;

export type EntrySection = (typeof ENTRY_SECTIONS)[number];

function isEntrySection(value: string): value is EntrySection {
  return ENTRY_SECTIONS.some((section) => section === value);
}

export interface ScopeOptions {
  flow?: string;
  path?: string;
}

export interface ScopeEntry {
  flow: string;
  section: EntrySection;
  key: string;
  entry: Record<string, unknown>;
}

export interface ResolvedScope {
  /** Every flow in the file, in file order. */
  allFlows: string[];
  /** Flows every per-flow check runs on. */
  flows: string[];
  /** Entries a `--path` addressed, one per flow that has it. */
  entries: ScopeEntry[];
  /** Flows searched for the `--path` entry (empty without a path). */
  searchedFlows: string[];
  /** The entry a `--path` names, when one was given and parsed. */
  target?: { section?: EntrySection; key: string };
  /** FLOW_NOT_FOUND, ENTRY_NOT_FOUND, AMBIGUOUS_ENTRY, UNSUPPORTED_SECTION, INVALID_PATH. */
  errors: ValidationError[];
}

/**
 * The one place validate picks flows and entries. `flow` narrows to that
 * flow; without it every flow is in scope. `path` (`section.key` or `key`)
 * addresses the entry in every flow in scope that has it.
 */
export function resolveScope(
  config: unknown,
  options: ScopeOptions = {},
): ResolvedScope {
  const flowsValue = isObject(config) ? config.flows : undefined;
  const flowMap = isObject(flowsValue) ? flowsValue : {};
  const allFlows = Object.keys(flowMap);

  let flows = allFlows;
  if (options.flow !== undefined) {
    if (!allFlows.includes(options.flow)) {
      return {
        allFlows,
        flows: [],
        entries: [],
        searchedFlows: [],
        errors: [
          {
            path: 'flows',
            message: `Flow "${options.flow}" not found. Available: ${allFlows.join(', ') || 'none'}`,
            code: 'FLOW_NOT_FOUND',
          },
        ],
      };
    }
    flows = [options.flow];
  }

  const path = options.path;
  if (path === undefined) {
    return { allFlows, flows, entries: [], searchedFlows: [], errors: [] };
  }

  const parts = path.split('.');
  let sections: readonly EntrySection[] = ENTRY_SECTIONS;
  let section: EntrySection | undefined;
  let key: string;
  if (parts.length === 2 && parts[0] !== '' && parts[1] !== '') {
    if (!isEntrySection(parts[0])) {
      return {
        allFlows,
        flows,
        entries: [],
        searchedFlows: [],
        errors: [
          {
            path,
            message: `Section "${parts[0]}" cannot be addressed by --path. Use one of: ${ENTRY_SECTIONS.join(', ')}`,
            code: 'UNSUPPORTED_SECTION',
          },
        ],
      };
    }
    section = parts[0];
    sections = [section];
    key = parts[1];
  } else if (parts.length === 1 && parts[0] !== '') {
    key = parts[0];
  } else {
    return {
      allFlows,
      flows,
      entries: [],
      searchedFlows: [],
      errors: [
        {
          path,
          message: `Invalid path "${path}". Use "section.key" or just "key"`,
          code: 'INVALID_PATH',
        },
      ],
    };
  }

  const entries: ScopeEntry[] = [];
  for (const flow of flows) {
    const flowValue = flowMap[flow];
    if (!isObject(flowValue)) continue;
    for (const candidate of sections) {
      const sectionValue = flowValue[candidate];
      if (!isObject(sectionValue)) continue;
      const entry = sectionValue[key];
      if (isObject(entry))
        entries.push({ flow, section: candidate, key, entry });
    }
  }

  const matched = [...new Set(entries.map((entry) => entry.section))];
  if (matched.length > 1) {
    return {
      allFlows,
      flows,
      entries: [],
      searchedFlows: flows,
      target: { key },
      errors: [
        {
          path,
          message: `Ambiguous key "${key}" found in multiple sections: ${matched.join(', ')}. Use dot-notation (e.g., ${matched[0]}.${key})`,
          code: 'AMBIGUOUS_ENTRY',
        },
      ],
    };
  }

  const target = { section: section ?? matched[0], key };
  if (entries.length === 0) {
    return {
      allFlows,
      flows,
      entries,
      searchedFlows: flows,
      target,
      errors: [
        {
          path,
          message: `Entry "${key}" not found in ${section ?? 'any section'} of flow(s): ${flows.join(', ') || 'none'}`,
          code: 'ENTRY_NOT_FOUND',
        },
      ],
    };
  }

  return {
    allFlows,
    flows,
    entries,
    searchedFlows: flows,
    target,
    errors: [],
  };
}

/** The flow a result path belongs to, or undefined for a file-level path. */
export function flowOfPath(
  path: string,
  flowNames: readonly string[],
): string | undefined {
  return flowNames.find(
    (name) => path === `flows.${name}` || path.startsWith(`flows.${name}.`),
  );
}

/** `details.scope` for a resolved scope and the checks the run included. */
export function describeScope(
  resolved: ResolvedScope,
  checks: ValidateCheck[],
): ValidateScope {
  const scope: ValidateScope = { flows: resolved.flows, checks };
  if (resolved.target) {
    const { section, key } = resolved.target;
    scope.entry = {
      ...(section ? { section } : {}),
      key,
      flows: [...new Set(resolved.entries.map((entry) => entry.flow))],
      searchedFlows: resolved.searchedFlows,
    };
  }
  return scope;
}
