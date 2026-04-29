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
    name: 'page view',
    data: { title: 'Home Page', path: '/home' },
    context: {},
    globals: {},
    custom: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: '0123456789abcdef',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000000000,
    timing: 0,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/home',
    },
  },

  // Maps to purchaseCall in outputs.ts
  purchase: {
    name: 'order complete',
    data: { id: 'T-123', total: 99.99 },
    context: {},
    globals: {},
    custom: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: 'fedcba9876543210',
    trigger: 'click',
    entity: 'order',
    action: 'complete',
    timestamp: 1700000001000,
    timing: 100,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/checkout',
    },
  },

  // Maps to customEventCall in outputs.ts
  buttonClick: {
    name: 'button click',
    data: { id: 'cta', text: 'Sign Up' },
    context: {},
    globals: {},
    custom: {},
    user: { device: 'device-123' },
    nested: [],
    consent: { analytics: true },
    id: 'a1b2c3d4e5f60718',
    trigger: 'click',
    entity: 'button',
    action: 'click',
    timestamp: 1700000002000,
    timing: 200,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/home',
    },
  },
};
