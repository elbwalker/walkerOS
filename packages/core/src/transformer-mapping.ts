import type { Mapping } from './types';
import { isArray, isObject } from './is';

/**
 * A transformer entry as far as its declarative mapping is concerned: a
 * runtime init entry (`Transformer.InitTransformer`) or a flow step
 * (`Flow.Transformer`, whose `config` the caller narrows to an object).
 */
export interface TransformerMappingEntry<M = unknown> {
  code?: unknown;
  package?: unknown;
  mapping?: M;
  config?: { mapping?: M };
}

/**
 * Mapping fields that do nothing at the transformer position. A
 * transformer's mapping only mutates the event: config-level `policy` and a
 * rule's `condition`, `policy`, `name` and `ignore` apply. Everything that
 * shapes a vendor payload or gates a destination is a no-op there.
 */
const CONFIG_NO_OPS = [
  'consent',
  'include',
  'data',
] as const satisfies ReadonlyArray<keyof Mapping.Config>;

const RULE_NO_OPS = [
  'consent',
  'include',
  'remove',
  'batch',
  'settings',
  'extend',
  'data',
  'silent',
] as const satisfies ReadonlyArray<keyof Mapping.Rule>;

/**
 * The mapping a transformer step declares. A `config.mapping` wins over the
 * step-level `mapping`, as `config.state` wins over `state`.
 */
export function getTransformerMapping<M>(
  entry: TransformerMappingEntry<M>,
): M | undefined {
  return entry.config?.mapping ?? entry.mapping;
}

/**
 * Dotted paths of the fields in `mapping` that do nothing at the
 * transformer position, rooted at `field`. Rules in array form are indexed.
 */
function getNoOpPaths(mapping: unknown, field: string): string[] {
  if (!isObject(mapping)) return [];
  const paths: string[] = [];
  for (const key of CONFIG_NO_OPS) {
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
        for (const key of RULE_NO_OPS) {
          if (rule[key] !== undefined) paths.push(`${at}.${key}`);
        }
      });
    }
  }
  return paths;
}

/**
 * Warnings for a transformer's declarative mapping, one definition for the
 * collector's init warning and `validateFlowStructure`. They never reject
 * the entry: a rejected transformer would be skipped whole.
 *
 * - A transformer with `code` or `package` never runs its mapping.
 * - On a code-less transformer, a step-level `mapping` that `config.mapping`
 *   overrides, and fields that do nothing at this position.
 */
export function getTransformerMappingWarnings(
  entry: TransformerMappingEntry,
): string[] {
  const mapping = getTransformerMapping(entry);
  if (mapping === undefined) return [];
  const field =
    entry.config?.mapping !== undefined ? 'config.mapping' : 'mapping';
  // Both declared: `config.mapping` wins over the step-level `mapping`.
  const both = field === 'config.mapping' && entry.mapping !== undefined;

  if (entry.code !== undefined || entry.package !== undefined) {
    const by = entry.code !== undefined ? 'code' : 'package';
    const ignored = both
      ? '`config.mapping` and `mapping` are'
      : `\`${field}\` is`;
    return [
      `${ignored} ignored: a transformer with \`${by}\` never runs ${both ? 'them' : 'it'}; a mapping applies only to a transformer without code.`,
    ];
  }

  const warnings: string[] = [];
  if (both) {
    warnings.push(
      '`mapping` is overridden: `config.mapping` wins; remove one.',
    );
  }

  const paths = getNoOpPaths(mapping, field);
  if (paths.length > 0) {
    warnings.push(
      `${paths.map((path) => `\`${path}\``).join(', ')} ${
        paths.length === 1 ? 'does' : 'do'
      } nothing at the transformer position; only \`policy\` and a rule's \`condition\`, \`policy\`, \`name\` and \`ignore\` apply.`,
    );
  }
  return warnings;
}
