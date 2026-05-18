/**
 * Development exports for transformer-ga4.
 * Used by website documentation, step examples, and downstream tests.
 *
 * Mirrors the validator's dev.ts pattern: only primitives leak out here, the
 * transformer instance is reached via the package entry (`./index.ts`).
 */

export {
  parseRequest,
  parseQuery,
  parseBody,
  parseItem,
  parseConsent,
} from './parse';
export { defaultMapping } from './defaults';
export { mapHitToEvents } from './map';
export type {
  GA4Settings,
  GA4Mapping,
  GA4Request,
  GA4Hit,
  GA4Event,
  GA4EventParams,
  GA4HitParams,
  GA4Item,
} from './types';

export * as examples from './examples';
