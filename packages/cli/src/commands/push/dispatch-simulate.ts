import { planSimulate } from './plan-simulate.js';

export interface SimulateDispatch {
  route: 'none' | 'source' | 'destination' | 'transformer';
  ids: string[];
}

/**
 * Adapter between `planSimulate` and the dispatcher in `index.ts`.
 * Renames `kind` → `route` so the dispatcher's `switch` reads naturally.
 * Kept separate from planSimulate so parsing logic and call-site adaptation
 * can evolve independently.
 */
export function dispatchSimulate(flags: readonly string[]): SimulateDispatch {
  const plan = planSimulate(flags);
  return { route: plan.kind, ids: plan.ids };
}
