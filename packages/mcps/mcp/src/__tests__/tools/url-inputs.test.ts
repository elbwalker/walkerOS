import '../support/version.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createLocalRuntime } from '../../runtime/local.js';
import { createToolHandlers } from '../../tool-handlers.js';
import { isErrorResult, textOf } from '../support/tool-result.js';

const BASE = 'https://config.example.test';
const server = setupServer(
  http.get(`${BASE}/missing.json`, () =>
    HttpResponse.json({ error: 'missing' }, { status: 404 }),
  ),
  http.get(`${BASE}/forbidden.json`, () =>
    HttpResponse.json({ error: 'expired' }, { status: 403 }),
  ),
  http.get(`${BASE}/gone.json`, () =>
    HttpResponse.json({ error: 'expired' }, { status: 410 }),
  ),
  http.get(`${BASE}/page.html`, () =>
    HttpResponse.html('<html>Sign in</html>'),
  ),
  http.get(`${BASE}/down.json`, () => HttpResponse.error()),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const tools = createToolHandlers(createLocalRuntime());

describe('a URL input that cannot be read fails visibly', () => {
  it.each([
    ['an HTTP error status', `${BASE}/missing.json`, /404/],
    ['an expired link (403)', `${BASE}/forbidden.json`, /403/],
    ['an expired link (410)', `${BASE}/gone.json`, /410/],
    ['a body that is not JSON', `${BASE}/page.html`, /Invalid JSON/],
    ['an unreachable host', `${BASE}/down.json`, /Could not reach/],
  ])('flow_load names %s', async (_label, url, expected) => {
    const result = await tools.flow_load.handler({ source: url });
    expect(isErrorResult(result)).toBe(true);
    expect(textOf(result)).toMatch(expected);
  });

  const gone = `${BASE}/gone.json`;
  it.each([
    [
      'flow_simulate',
      () =>
        tools.flow_simulate.handler({
          configPath: gone,
          step: 'destination.demo',
          event: { name: 'page view' },
        }),
    ],
    ['flow_bundle', () => tools.flow_bundle.handler({ configPath: gone })],
    [
      'flow_push',
      () =>
        tools.flow_push.handler({
          configPath: gone,
          event: { name: 'page view' },
        }),
    ],
    ['flow_examples', () => tools.flow_examples.handler({ configPath: gone })],
    [
      'flow_validate, type flow',
      () => tools.flow_validate.handler({ type: 'flow', input: gone }),
    ],
    [
      'flow_validate, type event',
      () => tools.flow_validate.handler({ type: 'event', input: gone }),
    ],
  ])('%s fails with the 410 of an expired link', async (_label, call) => {
    const result = await call();
    expect(isErrorResult(result)).toBe(true);
    expect(textOf(result)).toMatch(/410/);
  });
});
