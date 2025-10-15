import type { Destination, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Mock destination for demonstration purposes.
 * Shows the simple pattern: Website provides a custom fn to capture and format output.
 *
 * In production, the website would:
 * 1. Import real destination: `import destinationPlausible from '@walkeros/web-destination-plausible'`
 * 2. Pass custom fn that captures calls and returns formatted string
 */

export const mockDestination: Destination.Instance = {
  type: 'example-tracker',
  config: {},
  env: {
    window: {
      exampleTracker: () => {}, // Will be replaced by capture function
    },
  },
  push(event, { data, env }) {
    const { window } = env as { window: { exampleTracker: Function } };
    window.exampleTracker(event.name, data);
  },
};

// Custom capture function - Website provides this to DestinationDemo
export async function captureDestinationOutput(
  event: WalkerOS.Event,
  context: Destination.PushContext,
): Promise<string> {
  const calls: string[] = [];

  // Replace env function with capture version
  const mockEnv = {
    window: {
      exampleTracker: (...args: unknown[]) => {
        const formatted = args
          .map((arg) => {
            if (typeof arg === 'string') return `"${arg}"`;
            return JSON.stringify(arg, null, 2);
          })
          .join(', ');
        calls.push(`exampleTracker(${formatted});`);
      },
    },
  };

  // Call destination with capture env
  await mockDestination.push(event, { ...context, env: mockEnv });

  return calls.join('\n') || 'No function calls captured';
}

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
