import { getEvent } from '@walkeros/core';

/**
 * Examples of API calls the destination will make.
 * Tests verify implementation produces these outputs.
 */

const sampleEvent = getEvent('entity action');

// Full event POST (default behavior)
export const fullEventPost = {
  url: 'https://api.example.com/events',
  body: JSON.stringify(sampleEvent),
  options: { headers: undefined, method: undefined, timeout: undefined },
};

// POST with custom data (via mapping)
export const mappedDataPost = {
  url: 'https://api.example.com/events',
  body: JSON.stringify(sampleEvent.data),
  options: { headers: undefined, method: undefined, timeout: undefined },
};

// POST with custom headers and method
export const customOptionsPost = {
  url: 'https://api.example.com/events',
  body: JSON.stringify(sampleEvent),
  options: {
    headers: { 'X-API-Key': 'secret', 'Content-Type': 'application/json' },
    method: 'PUT',
    timeout: 10000,
  },
};
