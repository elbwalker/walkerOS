import { settings } from '../schemas';
import pkg from '../../package.json';

describe('Settings schema', () => {
  // The descriptions render on the docs page and in MCP package_get, so they
  // must say what the source does: the prefix only names events, and a filter
  // result of true skips the event (filter.test.ts pins the behaviour).
  it.each([
    ['prefix', /^Entity of every event name/],
    ['filter', /return true to skip the event/],
  ])('describes %s by its behaviour', (key, pattern) => {
    expect(settings).toMatchObject({
      properties: { [key]: { description: expect.stringMatching(pattern) } },
    });
  });
});

describe('Package metadata', () => {
  it('links the documentation page with its exact path', () => {
    expect(pkg.walkerOS.docs).toBe(
      'https://www.walkeros.io/docs/sources/web/dataLayer',
    );
  });
});
