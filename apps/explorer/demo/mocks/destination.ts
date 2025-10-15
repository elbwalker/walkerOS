import type { Destination } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Mock destination for demonstration purposes.
 * This shows the pattern for how destinations work without requiring
 * actual destination packages as dependencies.
 *
 * In production, the website would import real destinations:
 * import destinationPlausible from '@walkeros/web-destination-plausible'
 */

export const mockDestination: Destination.Instance = {
  type: 'example-tracker',
  config: {},
  env: {
    window: {
      // Mock tracking function that will be intercepted
      exampleTracker: () => {},
    },
  },
  push(event, { data, env }) {
    // This mimics how real destinations call external APIs
    const { window } = env as { window: { exampleTracker: Function } };
    window.exampleTracker(event.name, data);
  },
};

// Example mapping configuration
export const exampleMapping = {
  name: 'custom_event',
  data: {
    map: {
      event_id: 'data.id',
      event_value: 'data.amount',
      user_id: 'user.id',
    },
  },
};

// Example event
export const exampleEvent = getEvent('product view', {
  id: 'P123',
  name: 'Laptop Pro',
  amount: 999,
  category: 'Electronics',
});
