import type { WalkerOS } from '@walkeros/core';

/**
 * Example events for testing transformer behavior.
 * Create these BEFORE implementation to define expected transformations.
 */

// Event that should pass through modified
export const validEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    id: 'P-123',
    name: 'Widget',
    email: 'user@example.com', // Sensitive - should be redacted
  },
};

// Expected output after processing
export const processedEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    id: 'P-123',
    name: 'Widget',
    // email removed by redaction
  },
};

// Event that should be blocked
export const invalidEvent: WalkerOS.DeepPartialEvent = {
  event: 'product view',
  data: {
    // Missing required 'id' field
    name: 'Widget',
  },
};
