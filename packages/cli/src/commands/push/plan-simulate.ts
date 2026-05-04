import { parseStep } from './overrides.js';

/**
 * Route plan derived from raw `--simulate` flags. The dispatcher in
 * `index.ts` reads `kind` and either skips simulation (`none`), runs the
 * matching typed route once, or — for `destination` only — loops over
 * `ids` calling the typed route per id.
 *
 * Rules:
 * - Empty input → kind 'none'.
 * - Per-flag format must match `parseStep` (delegated, single source of truth).
 * - 4-part chain syntax (`destination.X.before.Y`) is `--mock`-only and rejected here.
 * - Mixed types in the same invocation throw.
 * - source.* and transformer.* simulate is single-target. Multiple flags throw.
 * - destination.* is multi-target. Duplicate ids are deduped.
 */
export type SimulatePlan =
  | { kind: 'none'; ids: [] }
  | { kind: 'source' | 'destination' | 'transformer'; ids: string[] };

export function planSimulate(flags: readonly string[]): SimulatePlan {
  if (flags.length === 0) return { kind: 'none', ids: [] };

  const parsed = flags.map((flag) => {
    const step = parseStep(flag);
    if (step.chainType) {
      throw new Error(
        `--simulate "${flag}": chain syntax (${step.type}.${step.name}.${step.chainType}.…) is not supported for --simulate. Use --mock for path-specific overrides.`,
      );
    }
    return step;
  });

  const types = new Set(parsed.map((p) => p.type));
  if (types.size > 1) {
    const sorted = [...types].sort();
    throw new Error(
      `Cannot --simulate ${sorted.join(' and ')} in the same invocation. Run separate commands for each step type.`,
    );
  }

  const [type] = types;
  const ids = [...new Set(parsed.map((p) => p.name))];

  if ((type === 'source' || type === 'transformer') && ids.length > 1) {
    throw new Error(
      `--simulate ${type}.* expects a single target; got ${ids.length}. Run one --simulate ${type}.NAME per invocation.`,
    );
  }

  return { kind: type, ids };
}
