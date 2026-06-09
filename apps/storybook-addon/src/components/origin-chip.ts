import type { PropertyOrigin } from '../types';

// Human-readable origin label for non-default origins (empty for directly
// declared data). Rendered as a thin "(generic)" / "(scoped)" suffix.
export const originLabel = (origin: PropertyOrigin): string =>
  origin === 'data' ? '' : origin;
