import type { WalkerOS } from '@walkeros/core';

/**
 * Expected walkerOS events from Lambda inputs.
 * These are what processEvent should produce.
 */

// From apiGatewayV2PostEvent
export const pageViewEvent: Partial<WalkerOS.Event> = {
  name: 'page view',
  data: { title: 'Home Page', path: '/' },
  user: { id: 'user-123' },
};

// From apiGatewayV2GetEvent
export const buttonClickEvent: Partial<WalkerOS.Event> = {
  name: 'button click',
  data: { id: 'cta', text: 'Sign Up' },
};

// From apiGatewayV1PostEvent
export const productAddEvent: Partial<WalkerOS.Event> = {
  name: 'product add',
  data: { id: 'P123', name: 'Laptop', price: 999 },
};
