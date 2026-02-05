import type { WalkerOS } from '@walkeros/core';

/**
 * walkerOS events that trigger destination calls.
 * Maps to outputs.ts examples.
 *
 * Create this file BEFORE implementation (Phase 2).
 */
export const events: Record<string, WalkerOS.Event> = {
  // Maps to pageViewCall in outputs.ts
  pageView: {
    event: 'page view',
    data: { title: 'Home Page', path: '/home' },
    context: {},
    globals: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: '1-abc-1',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000000000,
    timing: 0,
    group: 'group-1',
    count: 1,
    version: { tagging: 1, config: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },

  // Maps to purchaseCall in outputs.ts
  purchase: {
    event: 'order complete',
    data: { id: 'T-123', total: 99.99 },
    context: {},
    globals: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: '2-def-2',
    trigger: 'click',
    entity: 'order',
    action: 'complete',
    timestamp: 1700000001000,
    timing: 100,
    group: 'group-1',
    count: 2,
    version: { tagging: 1, config: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },

  // Maps to customEventCall in outputs.ts
  buttonClick: {
    event: 'button click',
    data: { id: 'cta', text: 'Sign Up' },
    context: {},
    globals: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: '3-ghi-3',
    trigger: 'click',
    entity: 'button',
    action: 'click',
    timestamp: 1700000002000,
    timing: 200,
    group: 'group-1',
    count: 3,
    version: { tagging: 1, config: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },
};
