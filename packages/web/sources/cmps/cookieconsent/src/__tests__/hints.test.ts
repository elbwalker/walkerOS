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

const jsonBlocks = Object.entries(hints).flatMap(([name, hint]) =>
  (hint.code ?? [])
    .filter((block) => block.lang === 'json')
    .map((block): [string, string] => [name, block.code]),
);

describe('hints', () => {
  // A hint block with top-level settings is pasted into this source's config,
  // so it may only show settings this source has.
  it('shows only CookieConsent source settings in a source settings block', () => {
    const known = Object.keys(schemas.SettingsSchema.shape);
    for (const [, code] of jsonBlocks) {
      const settings = at(code, ['settings']);
      if (isRecord(settings))
        for (const key of Object.keys(settings)) expect(known).toContain(key);
    }
  });

  // The ERROR line for a missing global names this fix, so the hint must
  // show the same assignment.
  it('assigns the ESM import to window.CookieConsent', () => {
    const code = (hints['troubleshoot-esm-global'].code ?? [])
      .map((block) => block.code)
      .join('\n');
    expect(code).toContain(
      "import * as CookieConsent from 'vanilla-cookieconsent';",
    );
    expect(code).toContain('window.CookieConsent = CookieConsent;');
  });

  // hideFromBots is a setting of CookieConsent.run, not of this source, so it
  // never appears in a JSON block that reads as source settings.
  it('sets hideFromBots false in CookieConsent.run, outside the source config', () => {
    const blocks = hints['troubleshoot-automated-browser'].code ?? [];
    expect(blocks.some((block) => block.lang === 'json')).toBe(false);
    const run = blocks.find((block) => block.lang === 'javascript')?.code ?? '';
    expect(run).toContain('CookieConsent.run(');
    expect(run).toContain('hideFromBots: false');
  });
});
