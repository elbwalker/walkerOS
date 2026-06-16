import type { UsercentricsV2Service } from '../types';

/**
 * Example Usercentrics V2 service inputs.
 *
 * These mirror the shape returned by `window.UC_UI.getServicesBaseInfo()`:
 * an array of services, each carrying a `categorySlug`, optional display
 * `name`, and a `consent` block with the current `status` plus a decision
 * `history`. The adapter derives the explicit/implicit gate from whether any
 * history entry is `explicit`, and aggregates services into group-level
 * consent via strict AND per `categorySlug`.
 */

/**
 * Full consent - every category accepted via an explicit decision
 * (user clicked "Accept all").
 */
export const servicesFullExplicit: UsercentricsV2Service[] = [
  {
    categorySlug: 'essential',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
  {
    categorySlug: 'functional',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
  {
    categorySlug: 'marketing',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
];

/**
 * Minimal consent - only essential accepted, others denied via an explicit
 * decision (user clicked "Deny all").
 */
export const servicesMinimalExplicit: UsercentricsV2Service[] = [
  {
    categorySlug: 'essential',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
  {
    categorySlug: 'functional',
    consent: { status: false, history: [{ type: 'explicit', status: false }] },
  },
  {
    categorySlug: 'marketing',
    consent: { status: false, history: [{ type: 'explicit', status: false }] },
  },
];

/**
 * Partial consent - essential and functional accepted, marketing denied,
 * all via an explicit decision (user saved a custom selection).
 */
export const servicesPartialExplicit: UsercentricsV2Service[] = [
  {
    categorySlug: 'essential',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
  {
    categorySlug: 'functional',
    consent: { status: true, history: [{ type: 'explicit', status: true }] },
  },
  {
    categorySlug: 'marketing',
    consent: { status: false, history: [{ type: 'explicit', status: false }] },
  },
];

/**
 * First-visit implicit state - the CMP reports page-load defaults with only
 * implicit history. The default `explicitOnly` gate suppresses this, so no
 * consent command is emitted.
 */
export const servicesFirstVisitImplicit: UsercentricsV2Service[] = [
  {
    categorySlug: 'essential',
    consent: { status: true, history: [{ type: 'implicit', status: true }] },
  },
  {
    categorySlug: 'functional',
    consent: { status: false, history: [{ type: 'implicit', status: false }] },
  },
  {
    categorySlug: 'marketing',
    consent: { status: false, history: [{ type: 'implicit', status: false }] },
  },
];
