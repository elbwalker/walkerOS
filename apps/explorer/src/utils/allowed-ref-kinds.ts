import type { IntelliSenseContext } from '../types/intellisense';

/** The `$`-ref kinds the completion gate can offer. Mirrors core's ref families. */
export type RefKind = 'var' | 'env' | 'store' | 'flow' | 'secret' | 'contract';

/**
 * Single pure scope gate for `$`-ref completion, shared by Monaco (subPath derived
 * live from the cursor) and every Form field (subPath passed statically):
 * - `$var`/`$env`/`$secret` broadly
 * - `$store` only under an `env` subPath
 * - `$flow` only in settings/env of source/destination
 * - `$contract` only at a `validate.events.<entity>.<action>` value path
 */
export function allowedRefKinds(
  nodeType: IntelliSenseContext['nodeType'],
  subPath: string[] = [],
): RefKind[] {
  const kinds: RefKind[] = ['var', 'env', 'secret'];
  const inEnv = subPath.includes('env');
  const inSettings = subPath.includes('settings');

  if (inEnv) kinds.push('store');

  const isSourceOrDest = nodeType === 'source' || nodeType === 'destination';
  if (isSourceOrDest && (inSettings || inEnv)) kinds.push('flow');

  // `$contract` resolves at a validate-events value, i.e. under
  // validate.events.<entity>.<action>.
  const validateIndex = subPath.indexOf('validate');
  const inValidateEvents =
    validateIndex >= 0 && subPath[validateIndex + 1] === 'events';
  if (inValidateEvents && subPath.length >= validateIndex + 4) {
    kinds.push('contract');
  }

  return kinds;
}
