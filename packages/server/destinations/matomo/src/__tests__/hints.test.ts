import { hints, schemas } from '../dev';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The value at a key path of a parsed JSON hint block, if every step is an object. */
function at(json: string, path: string[]): unknown {
  let node: unknown = JSON.parse(json);
  for (const key of path) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return node;
}

const jsonBlocks = Object.values(hints).flatMap((hint) =>
  (hint.code ?? [])
    .filter((block) => block.lang === 'json')
    .map((block) => block.code),
);

describe('hints', () => {
  // A hint block with top-level settings is pasted into this destination's
  // config, so it may only show settings this destination has.
  it('shows only Matomo settings in a settings block', () => {
    const known = Object.keys(schemas.SettingsSchema.shape);
    expect(jsonBlocks.length).toBeGreaterThan(0);
    for (const code of jsonBlocks) {
      const settings = at(code, ['settings']);
      if (isRecord(settings))
        for (const key of Object.keys(settings)) expect(known).toContain(key);
    }
  });

  // The several-sites block is copied as is: its functions must route each
  // host to its own Matomo and site when a flow evaluates them, and give no
  // value, without a throw, for an event without a page URL.
  it.each<[string, string | undefined, string | undefined, string | undefined]>(
    [
      [
        'shop A',
        'https://shop-a.example/cart',
        'https://a.matomo.example/',
        '1',
      ],
      ['shop B', 'https://shop-b.example/', 'https://b.matomo.example/', '2'],
      ['an event without a URL', undefined, undefined, undefined],
    ],
  )('routes %s in the several-sites block', (_, page, url, siteId) => {
    const code = hints['several-sites'].code?.[0]?.code ?? '{}';
    const context = { event: { source: { url: page } } };
    const rows: Array<[string, string | undefined]> = [
      ['url', url],
      ['siteId', siteId],
    ];
    for (const [key, expected] of rows) {
      const fn = at(code, ['settings', key, 'fn']);
      expect(fn).toEqual(expect.stringMatching(/^\$code:/));
      const revived: unknown = new Function(
        `return (${String(fn).slice('$code:'.length)});`,
      )();
      if (typeof revived !== 'function')
        throw new Error(`${key} is no function`);
      expect(revived(undefined, context)).toBe(expected);
    }
  });
});
