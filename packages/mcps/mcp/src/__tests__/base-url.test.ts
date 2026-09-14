import { normalizeBaseUrl } from '../base-url.js';

/**
 * The base URL is user-settable through `WALKEROS_APP_URL` and the CLI config
 * file, and every emitted deep link is built by appending a path to it. A shape
 * that survives normalization becomes a wrong link in somebody's transcript,
 * which is why these cases are about shapes rather than about one bug.
 */
describe('normalizeBaseUrl', () => {
  it.each([
    ['https://app.example.com', 'https://app.example.com'],
    ['https://app.example.com/', 'https://app.example.com'],
    ['https://app.example.com///', 'https://app.example.com'],
  ])('trims trailing slashes: %s', (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });

  /**
   * The case this file was added for. A path appended to a query or a fragment
   * lands inside it, so the link points at nothing.
   */
  it.each([
    ['https://app.example.com?foo=bar', 'https://app.example.com'],
    ['https://app.example.com/?foo=bar', 'https://app.example.com'],
    ['https://app.example.com#section', 'https://app.example.com'],
    ['https://app.example.com/?foo=bar#section', 'https://app.example.com'],
  ])('drops a query and a fragment: %s', (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });

  it('appending a path to the result stays on the path', () => {
    const base = normalizeBaseUrl('https://app.example.com?foo=bar');
    expect(`${base}/projects/proj_1/flows/flw_1`).toBe(
      'https://app.example.com/projects/proj_1/flows/flw_1',
    );
  });

  /**
   * An app mounted under a subpath is a real deployment. Dropping the path
   * would break every link for those users instead of fixing one.
   */
  it.each([
    ['https://example.com/walkeros', 'https://example.com/walkeros'],
    ['https://example.com/walkeros/', 'https://example.com/walkeros'],
    ['https://example.com/walkeros/?a=b', 'https://example.com/walkeros'],
  ])('keeps a base path: %s', (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });

  it('keeps an explicit port', () => {
    expect(normalizeBaseUrl('http://localhost:3000/')).toBe(
      'http://localhost:3000',
    );
  });

  /**
   * Never throws: `diagnostics` calls this to report a misconfigured app URL,
   * so a normalizer that threw would take out the tool that names the problem.
   */
  it.each([
    ['not-a-url', 'not-a-url'],
    ['not-a-url/', 'not-a-url'],
    ['', ''],
  ])(
    'hands back an unparseable string rather than throwing: %s',
    (input, expected) => {
      expect(() => normalizeBaseUrl(input)).not.toThrow();
      expect(normalizeBaseUrl(input)).toBe(expected);
    },
  );
});
