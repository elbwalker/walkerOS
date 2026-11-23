import { tok } from '../../codeTokens';
import {
  htmlTokens,
  taggingFrame,
  type TaggingFrame,
  type TaggingScript,
} from '../data/tagging';
import { lineText } from '../parts/tokens';

describe('htmlTokens', () => {
  it('reads a tag, an attribute name and its value, in that order', () => {
    const tokens = htmlTokens('<div data-elb="product">');
    expect(
      tokens
        .filter((token) => token.kind !== 'punct')
        .map((token) => token.kind),
    ).toEqual(['tag', 'attr', 'str', 'tag']);
    expect(lineText(tokens)).toBe('<div data-elb="product">');
  });

  it.each([
    ['an element with text', '  <h3 class="title">Cotton Tee</h3>'],
    ['attributes on a line of their own', '  data-elbaction="click:add"'],
    ['the end of an opening tag', '>'],
    ['a void element', '<img src="/tee.jpg" alt="" />'],
    ['text only', 'Cotton Tee'],
    ['an unquoted value', '<input type=checkbox checked>'],
    ['an empty line', ''],
  ])('%s: the tokens join to the line', (_name, line) => {
    expect(lineText(htmlTokens(line))).toBe(line);
  });

  it('colours markup the way the hero demo does', () => {
    expect(
      htmlTokens(
        '  <span class="kicker" data-elb-article="category:#innerText">Tech</span>',
      ),
    ).toEqual([
      tok('  ', 'punct'),
      tok('<span', 'tag'),
      tok(' ', 'punct'),
      tok('class', 'attr'),
      tok('=', 'punct'),
      tok('"kicker"', 'str'),
      tok(' ', 'punct'),
      tok('data-elb-article', 'attr'),
      tok('=', 'punct'),
      tok('"category:#innerText"', 'str'),
      tok('>', 'tag'),
      tok('Tech', 'text'),
      tok('</span>', 'tag'),
    ]);
  });

  it('reads a line that continues a tag as attributes', () => {
    expect(htmlTokens('  data-elb="article"')).toEqual([
      tok('  ', 'punct'),
      tok('data-elb', 'attr'),
      tok('=', 'punct'),
      tok('"article"', 'str'),
    ]);
  });
});

const PRODUCT: TaggingScript = {
  lines: [
    {
      id: 'root',
      tokens: htmlTokens('<div data-elb="product">'),
      typeFrom: 1000,
      typeTo: 2000,
    },
    {
      id: 'name',
      tokens: htmlTokens(
        '  <h3 data-elb-product="name:#innerText">Cotton Tee</h3>',
      ),
      typeFrom: 2500,
      typeTo: 3000,
      lights: 'title',
    },
    {
      id: 'impression',
      tokens: htmlTokens('  data-elbaction="impression"'),
      typeFrom: 3500,
      typeTo: 4000,
    },
  ],
  card: { parts: [{ id: 'title', text: 'Cotton Tee', role: 'title' }] },
  events: [
    { name: 'product impression', data: { name: 'Cotton Tee' }, at: 4500 },
    { name: 'product add', data: { name: 'Cotton Tee' }, at: 6000 },
  ],
};

const shownText = (frame: TaggingFrame, id: string): string | null => {
  const line = frame.lines.find((entry) => entry.id === id);
  return line ? lineText(line.tokens) : null;
};

describe('taggingFrame', () => {
  it.each([
    [
      'an attribute inside markup: the markup stays, the attribute is typed',
      'root',
      1000,
      2000,
      '<div>',
      '<div data-elb="product">',
    ],
    [
      'a line of attributes only: the line comes with its typing',
      'impression',
      3500,
      4000,
      null,
      '  data-elbaction="impression"',
    ],
  ])('typing %s', (_name, id, typeFrom, typeTo, before, after) => {
    expect(shownText(taggingFrame(PRODUCT, typeFrom - 1), id)).toBe(before);
    expect(shownText(taggingFrame(PRODUCT, typeTo), id)).toBe(after);
  });

  it.each([
    [1999, false, []],
    [2000, true, [{ part: 'entity', text: 'product' }]],
    [
      4000,
      true,
      [
        { part: 'entity', text: 'product' },
        { part: 'action', text: 'impression' },
      ],
    ],
  ])(
    'pills at %i ms: a typed line that lights no part shows its tags, the entity tags the card',
    (t, tagged, pills) => {
      const { card } = taggingFrame(PRODUCT, t);
      expect(card.tagged).toBe(tagged);
      expect(card.pills).toEqual(pills);
    },
  );

  it('puts the caret on the line being typed, and none after the last line', () => {
    const caretLine = (t: number) =>
      taggingFrame(PRODUCT, t).lines.find((line) => line.caret !== null)?.id;
    expect([500, 1500, 2700, 3700, 4000, 9000].map(caretLine)).toEqual([
      undefined,
      'root',
      'name',
      'impression',
      undefined,
      undefined,
    ]);
  });

  it('lists the events from their time, newest first', () => {
    const rows = (t: number) =>
      taggingFrame(PRODUCT, t).rows.map((row) => [row.name, row.age]);
    expect(rows(4499)).toEqual([]);
    expect(rows(7000)).toEqual([
      ['product add', 1000],
      ['product impression', 2500],
    ]);
  });
});
