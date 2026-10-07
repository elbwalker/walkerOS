import { vizBg } from '@walkeros/explorer/design';
import { generateHighlightCSS } from '../utils/cssUtils';
import { highlightColors, type HighlightKind } from '../utils/eventColors';

const PREFIX = 'data-elb';
const KINDS = Object.keys(highlightColors).filter(
  (key): key is HighlightKind => key in highlightColors,
);

// The attribute each kind marks: entities carry the bare prefix.
const attribute = (kind: HighlightKind): string =>
  kind === 'entity' ? `[${PREFIX}]` : `[${PREFIX}${kind}]`;

interface OutlineRule {
  kinds: HighlightKind[];
  attributes: string[];
  rings: string[];
}

const parseRules = (css: string): OutlineRule[] =>
  [
    ...css.matchAll(
      /((?:\.highlight-\w+)+)\s+((?:\[[\w-]+\])+)\s*\{\s*box-shadow: ([^;]+) !important;\s*\}/g,
    ),
  ].map(([, classes, attributes, shadow]) => ({
    kinds: classes
      .split('.highlight-')
      .filter((kind): kind is HighlightKind => KINDS.some((k) => k === kind)),
    attributes: attributes.match(/\[[\w-]+\]/g) ?? [],
    rings: shadow.split(', '),
  }));

describe('generateHighlightCSS', () => {
  const css = generateHighlightCSS(PREFIX);
  const rules = parseRules(css);

  test('has one outline rule per combination of kinds', () => {
    expect(rules).toHaveLength(2 ** KINDS.length - 1);
    const combinations = rules.map(({ kinds }) => [...kinds].sort().join('+'));
    expect(new Set(combinations).size).toBe(rules.length);
    expect(css.match(/box-shadow:/g)).toHaveLength(rules.length);
  });

  test.each(KINDS)(
    '%s alone: its event colour ring and the dark edge',
    (kind) => {
      expect(css).toContain(
        `.highlight-${kind} ${attribute(kind)} {\n      box-shadow: 0 0 0 2px ${highlightColors[kind]}, 0 0 0 3px ${vizBg} !important;`,
      );
    },
  );

  const cases: Array<[string, OutlineRule]> = rules.map((rule) => [
    rule.kinds.join('.'),
    rule,
  ]);

  test.each(cases)(
    '%s: rings in its kinds colours, closed by the dark edge',
    (_, { kinds, attributes, rings }) => {
      expect([...attributes].sort()).toEqual(kinds.map(attribute).sort());

      const edge = rings[rings.length - 1];
      const colourRings = rings.slice(0, -1);
      expect(edge).toBe(`0 0 0 ${kinds.length * 2 + 1}px ${vizBg}`);
      expect(colourRings.map((ring) => ring.split(' ')[3])).toEqual(
        kinds.map((_, index) => `${(index + 1) * 2}px`),
      );
      expect(colourRings.map((ring) => ring.split(' ')[4]).sort()).toEqual(
        kinds.map((kind) => highlightColors[kind]).sort(),
      );
    },
  );
});
