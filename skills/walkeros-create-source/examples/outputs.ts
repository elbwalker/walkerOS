import type { WalkerOS } from '@walkeros/core';

/**
 * Not part of the examples layout: examples/index.ts does not export this
 * file, and a new source keeps its examples in step.ts (see SKILL.md, 3.2).
 */

// From pageViewInput -> walkerOS event
export const pageViewEvent: Partial<WalkerOS.Event> = {
  name: 'page view',
  data: {
    title: 'Home Page',
    path: '/home',
    referrer: 'https://google.com',
  },
  user: { id: 'user-123' },
};

// From purchaseInput -> walkerOS event
export const purchaseEvent: Partial<WalkerOS.Event> = {
  name: 'order complete',
  data: {
    id: 'T-123',
    value: 99.99,
    currency: 'USD',
  },
};

// From customEventInput -> walkerOS event
export const buttonClickEvent: Partial<WalkerOS.Event> = {
  name: 'button click',
  data: {
    id: 'cta',
    text: 'Sign Up',
  },
};
