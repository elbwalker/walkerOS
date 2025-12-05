/**
 * HTTP request examples for testing the fetch source.
 * Shows what external HTTP clients will send.
 */

export const validPostRequest = {
  method: 'POST',
  url: 'https://example.com/collect',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'page view',
    data: { title: 'Home' },
  }),
};

export const batchPostRequest = {
  method: 'POST',
  url: 'https://example.com/collect',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batch: [
      { name: 'page view', data: { title: 'Home' } },
      { name: 'button click', data: { id: 'cta' } },
    ],
  }),
};

export const pixelGetRequest = {
  method: 'GET',
  url: 'https://example.com/collect?event=page%20view&data[title]=Home&user[id]=user123',
};

export const healthCheckRequest = {
  method: 'GET',
  url: 'https://example.com/health',
};

export const optionsRequest = {
  method: 'OPTIONS',
  url: 'https://example.com/collect',
  headers: { Origin: 'https://example.com' },
};

export const invalidJsonRequest = {
  method: 'POST',
  url: 'https://example.com/collect',
  headers: { 'Content-Type': 'application/json' },
  body: 'invalid json{',
};

export const oversizedRequest = {
  method: 'POST',
  url: 'https://example.com/collect',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'test',
    data: { payload: 'x'.repeat(200000) }, // 200KB
  }),
};
