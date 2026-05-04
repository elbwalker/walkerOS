import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example allowing destination-level settings overrides.
 */
export type HotjarStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding -- every walkerOS event becomes Hotjar.event(name).
 * No mapping rule; the destination's default push behavior fires.
 */
export const defaultEventForwarding: HotjarStepExample = {
  title: 'Default event',
  description:
    'A walker event becomes a Hotjar.event call with the event name as the custom Hotjar event.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['hotjar.event', 'product view']],
};

/**
 * Wildcard ignore pattern -- suppresses noisy events.
 * The destination must produce zero calls.
 */
export const wildcardIgnored: HotjarStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Renamed event via mapping.name -- order complete becomes completed_purchase.
 */
export const renamedEvent: HotjarStepExample = {
  title: 'Renamed event',
  description:
    'A mapping renames the event so the Hotjar custom event uses a canonical name like completed_purchase.',
  in: getEvent('order complete', { timestamp: 1700000102 }),
  mapping: {
    name: 'completed_purchase',
  },
  out: [['hotjar.event', 'completed_purchase']],
};

/**
 * Per-event identity via mapping.settings.identify.
 * Resolves { userId, ...attributes } -> Hotjar.identify(userId, attributes).
 * Identify fires before event per Hotjar's guidance.
 */
export const userLoginIdentify: HotjarStepExample = {
  title: 'User login identify',
  description:
    'A user login fires Hotjar.identify with userId and attributes before firing the event.',
  in: getEvent('user login', {
    timestamp: 1700000103,
    data: { id: 'u-123', email: 'jane@example.com', plan: 'premium' },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          userId: 'data.id',
          email: 'data.email',
          plan: 'data.plan',
        },
      },
    },
  },
  out: [
    [
      'hotjar.identify',
      'u-123',
      { email: 'jane@example.com', plan: 'premium' },
    ],
    ['hotjar.event', 'user login'],
  ],
};

/**
 * Destination-level settings.identify -- fires on every push.
 * Hotjar recommends calling identify() on every page load.
 */
export const destinationLevelIdentify: HotjarStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify calls Hotjar.identify with the user id on every push as Hotjar recommends.',
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        userId: 'user.id',
      },
    },
  },
  out: [
    ['hotjar.identify', 'us3r', {}],
    ['hotjar.event', 'page view'],
  ],
};

/**
 * SPA state change -- stateChange mapping resolves to path string.
 * silent=true suppresses the default Hotjar.event() call.
 */
export const pageViewStateChange: HotjarStepExample = {
  title: 'State change',
  description:
    'An SPA navigation fires Hotjar.stateChange with the new path instead of a Hotjar custom event.',
  in: getEvent('page view', { timestamp: 1700000105 }),
  mapping: {
    silent: true,
    settings: {
      stateChange: 'data.id',
    },
  },
  out: [['hotjar.stateChange', '/docs/']],
};

/**
 * Combined features -- identify + renamed event on the same push.
 * Execution order: identify -> event.
 */
export const combinedFeatures: HotjarStepExample = {
  title: 'Combined features',
  description:
    'A purchase fires Hotjar.identify then the renamed custom event in the canonical execution order.',
  in: getEvent('order complete', { timestamp: 1700000106 }),
  mapping: {
    name: 'completed_purchase',
    settings: {
      identify: { map: { userId: 'user.id' } },
    },
  },
  out: [
    ['hotjar.identify', 'us3r', {}],
    ['hotjar.event', 'completed_purchase'],
  ],
};

/**
 * mapping.silent -- suppresses the default Hotjar.event() call. No other
 * settings active, so the destination produces zero calls.
 */
export const pageViewSilent: HotjarStepExample = {
  public: false,
  in: getEvent('page view', { timestamp: 1700000107 }),
  mapping: {
    silent: true,
  },
  out: [],
};
