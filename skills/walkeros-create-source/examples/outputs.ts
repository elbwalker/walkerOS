import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS events from inputs.
 * Tests verify implementation produces these outputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 */

// From pageViewInput -> walkerOS event
export const pageViewEvent: Partial<WalkerOS.Event> = {
  event: 'page view',
  data: {
    title: 'Home Page',
    path: '/home',
    referrer: 'https://google.com',
  },
  user: { id: 'user-123' },
};

// From purchaseInput -> walkerOS event
export const purchaseEvent: Partial<WalkerOS.Event> = {
  event: 'order complete',
  data: {
    id: 'T-123',
    total: 99.99,
    currency: 'USD',
  },
};

// From customEventInput -> walkerOS event
export const buttonClickEvent: Partial<WalkerOS.Event> = {
  event: 'button click',
  data: {
    id: 'cta',
    text: 'Sign Up',
  },
};
