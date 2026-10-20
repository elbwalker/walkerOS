import type { Mapping } from './types';
import { isArray, isObject } from './is';

/** A position a mapping runs at. */
export type MappingPosition = 'source' | 'transformer' | 'destination';

/**
 * Mapping fields that do nothing at a position, one table for the three.
 * - transformer: the mapping only mutates the event; config `policy` and a
 *   rule's `condition`, `policy`, `name` and `ignore` apply.
 * - source: only the edited event goes on; config `consent`, `policy` and a
 *   rule's `condition`, `policy`, `name` and `ignore` apply. A rule's
 *   `consent` is not listed here.
 * - destination: a rule's `extend` is merged only by a package onto its own
 *   shipped rules (`@walkeros/transformer-ga4`'s `settings.mapping`).
 */
export const MAPPING_NO_OPS: Record<
  MappingPosition,
  {
    config: ReadonlyArray<keyof Mapping.Config>;
    rule: ReadonlyArray<keyof Mapping.Rule>;
  }
> = {
  transformer: {
    config: ['consent', 'include', 'data'],
    rule: [
      'consent',
      'include',
      'remove',
      'batch',
      'settings',
      'extend',
      'data',
      'silent',
    ],
  },
  source: {
    config: ['data', 'include'],
    rule: [
      'data',
      'include',
      'remove',
      'batch',
      'settings',
      'extend',
      'silent',
    ],
  },
  destination: {
    config: [],
    rule: ['extend'],
  },
};

/** What applies at a position, for the message that names a no-op. */
const APPLIES: Record<MappingPosition, string> = {
  transformer:
    "only `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply",
  source:
    "only `consent`, `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply",
  destination:
    "a rule's `extend` is merged only by a package onto its own shipped rules; write the fields on the rule itself",
};

/**
 * Dotted paths of the fields in `mapping` that do nothing at `position`,
 * rooted at `field`. Rules in array form are indexed.
 */
export function getMappingNoOpPaths(
  position: MappingPosition,
  mapping: unknown,
  field: string,
): string[] {
  if (!isObject(mapping)) return [];
  const { config, rule: ruleKeys } = MAPPING_NO_OPS[position];
  const paths: string[] = [];
  for (const key of config) {
    if (mapping[key] !== undefined) paths.push(`${field}.${key}`);
  }

  const rules = mapping.mapping;
  if (!isObject(rules)) return paths;
  for (const [entity, actions] of Object.entries(rules)) {
    if (!isObject(actions)) continue;
    for (const [action, value] of Object.entries(actions)) {
      const list: unknown[] = isArray(value) ? value : [value];
      list.forEach((rule, index) => {
        if (!isObject(rule)) return;
        const at = `${field}.mapping.${entity}.${action}${
          isArray(value) ? `[${index}]` : ''
        }`;
        for (const key of ruleKeys) {
          if (rule[key] !== undefined) paths.push(`${at}.${key}`);
        }
      });
    }
  }
  return paths;
}

/** The message naming no-op paths at a position and what applies there. */
export function getMappingNoOpMessage(
  position: MappingPosition,
  paths: string[],
): string {
  return `${paths.map((path) => `\`${path}\``).join(', ')} ${
    paths.length === 1 ? 'does' : 'do'
  } nothing at the ${position} position; ${APPLIES[position]}.`;
}
