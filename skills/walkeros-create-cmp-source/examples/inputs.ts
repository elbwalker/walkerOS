/**
 * Example CMP consent inputs (boolean-map pattern).
 * These define the CONTRACT -- implementation must handle these inputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 *
 * For presence-based CMPs (e.g., CookiePro with comma-separated IDs),
 * adapt the shape: use string IDs instead of boolean maps, and initialize
 * all mapped groups to false (see mandatory check #1).
 */

/** Generic boolean-map consent shape -- adapt per CMP */
export type CmpConsent = Record<string, boolean>;

/** Full consent -- user accepted all categories */
export const fullConsent: CmpConsent = {
  necessary: true,
  functional: true,
  performance: true,
  advertising: true,
};

/** Partial consent -- user accepted only necessary and functional */
export const partialConsent: CmpConsent = {
  necessary: true,
  functional: true,
  performance: false,
  advertising: false,
};

/** Minimal consent -- user accepted only necessary (required) */
export const minimalConsent: CmpConsent = {
  necessary: true,
  functional: false,
  performance: false,
  advertising: false,
};

/** No consent -- CMP hasn't loaded or user hasn't chosen yet */
export const noConsent: CmpConsent | null = null;

/** Analytics only -- user accepted performance tracking */
export const analyticsOnly: CmpConsent = {
  necessary: true,
  functional: false,
  performance: true,
  advertising: false,
};

/** Marketing only -- user accepted advertising */
export const marketingOnly: CmpConsent = {
  necessary: true,
  functional: false,
  performance: false,
  advertising: true,
};

/**
 * Revocation input -- consent withdrawal (full to partial).
 * Used in revocation test flow: dispatch fullConsent first,
 * then dispatch this to verify explicit false values appear.
 */
export const revocationInput: CmpConsent = {
  necessary: true,
  functional: true,
  performance: false,
  advertising: false,
};
