import { getMappingNoOpMessage, getMappingNoOpPaths } from './mapping-no-ops';

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
 * The mapping a transformer step declares. A `config.mapping` wins over the
 * step-level `mapping`, as `config.state` wins over `state`.
 */
export function getTransformerMapping<M>(
  entry: TransformerMappingEntry<M>,
): M | undefined {
  return entry.config?.mapping ?? entry.mapping;
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

  const paths = getMappingNoOpPaths('transformer', mapping, field);
  if (paths.length > 0)
    warnings.push(getMappingNoOpMessage('transformer', paths));
  return warnings;
}
