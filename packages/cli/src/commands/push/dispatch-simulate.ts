import { planSimulate } from './plan-simulate.js';

export interface SimulateDispatch {
  kind: 'none' | 'source' | 'destination' | 'transformer' | 'collector';
  ids: string[];
}

/**
 * Adapter between `planSimulate` and the dispatcher in `index.ts`.
 * Carries forward `planSimulate`'s `kind` discriminator unchanged, kept
 * separate from planSimulate so parsing logic and call-site adaptation
 * can evolve independently.
 */
export function dispatchSimulate(flags: readonly string[]): SimulateDispatch {
  const plan = planSimulate(flags);
  return { kind: plan.kind, ids: plan.ids };
}
