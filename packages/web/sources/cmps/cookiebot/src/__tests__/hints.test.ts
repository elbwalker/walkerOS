import { examples, hints, schemas } from '../dev';

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
    .map((block) => [name, block.code] as const),
);

describe('hints', () => {
  // A hint block with top-level settings is pasted into this source's config,
  // so it may only show settings this source has.
  it('shows only Cookiebot settings in a source settings block', () => {
    const known = Object.keys(schemas.SettingsSchema.shape);
    for (const [, code] of jsonBlocks) {
      const settings = at(code, ['settings']);
      if (isRecord(settings))
        for (const key of Object.keys(settings)) expect(known).toContain(key);
    }
  });

  it('switches off Consent Mode on the gtag destination or the script tag', () => {
    const hint = hints['troubleshoot-google-consent-mode'];
    const blocks = hint.code ?? [];
    const gtag = blocks.find((block) => block.lang === 'json')?.code ?? '{}';
    expect(at(gtag, ['gtag', 'package'])).toBe(
      '@walkeros/web-destination-gtag',
    );
    expect(at(gtag, ['gtag', 'config', 'settings', 'como'])).toBe(false);
    const tag = blocks.find((block) => block.lang === 'html')?.code ?? '';
    expect(tag).toContain('data-consentmode="disabled"');
  });

  // A visitor Cookiebot never asks never makes an explicit choice, so under
  // the default their consent never arrives: the text must not promise a wait.
  it('says that a visitor Cookiebot never asks never sends consent', () => {
    const texts = [
      hints['consent-implied'].text,
      examples.step.impliedSkipped.description ?? '',
    ];
    for (const text of texts) {
      expect(text).toMatch(/a visitor Cookiebot never asks never sends/);
      expect(text).not.toMatch(
        /wait(s)? (until|for) (the visitor|an explicit)/,
      );
    }
  });
});
