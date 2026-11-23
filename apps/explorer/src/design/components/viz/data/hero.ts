/**
 * The hero demo's script: walkerOS attributes typed into an article teaser, the
 * card lighting up per tagged part, a click, and the events in a live table,
 * one article per loop. heroMarkup() is the tagged markup the demo ends on, and
 * heroEvents() what walkerOS makes of it; a fidelity test runs the one through
 * walkerOS and compares with the other. Imports only package-free demo parts.
 */
import { tok } from '../../codeTokens';
import { lineText } from '../parts/tokens';
import type { ThumbKind } from '../parts/Thumb';
import type { TaggingEvent, TaggingScript } from './tagging';

export interface HeroArticle {
  readonly kicker: string;
  readonly title: string;
  readonly thumb: ThumbKind;
}

export const HERO_ARTICLES: readonly HeroArticle[] = [
  { kicker: 'Tech', title: 'Return of the Bug', thumb: 'bug' },
  { kicker: 'Tech', title: 'The quiet return of RSS', thumb: 'tech' },
  { kicker: 'Food', title: 'Why sourdough came back', thumb: 'food' },
];

/** The first frame, on the server too: the first article tagged, both events in the table. */
export const HERO_START = 9000;

/** One article's loop, in ms. */
export const HERO_LOOP = 11500;

/** The loop's cues, in ms from the start of an article's loop. */
const CUE = {
  entityStart: 900,
  entityEnd: 1500,
  impressionStart: 1800,
  impressionEnd: 2600,
  categoryStart: 2900,
  categoryEnd: 3600,
  titleStart: 3900,
  titleEnd: 4700,
  actionStart: 5000,
  actionEnd: 5800,
  impressionEvent: 6200,
  click: 7850,
  openEvent: 8000,
};

const ENTITY = [
  tok('data-elb', 'attr'),
  tok('=', 'punct'),
  tok('"article"', 'str'),
];
const IMPRESSION = [
  tok('data-elbaction', 'attr'),
  tok('=', 'punct'),
  tok('"impression"', 'str'),
];
const CATEGORY = [
  tok(' ', 'punct'),
  tok('data-elb-article', 'attr'),
  tok('=', 'punct'),
  tok('"category:#innerText"', 'str'),
];
const TITLE = [
  tok(' ', 'punct'),
  tok('data-elb-article', 'attr'),
  tok('=', 'punct'),
  tok('"title:#innerText"', 'str'),
];
const ACTION = [
  tok(' ', 'punct'),
  tok('data-elbaction', 'attr'),
  tok('=', 'punct'),
  tok('"click:open"', 'str'),
];

export interface HeroEvent {
  readonly name: string;
  readonly data: Readonly<Record<string, string>>;
}

function articleAt(loop: number): HeroArticle {
  return HERO_ARTICLES[loop % HERO_ARTICLES.length];
}

/** What walkerOS makes of the tagged teaser: its impression and the click on Open. */
export function heroEvents(
  article: HeroArticle,
): readonly [HeroEvent, HeroEvent] {
  const data = { category: article.kicker, title: article.title };
  return [
    { name: 'article impression', data },
    { name: 'article open', data },
  ];
}

/** The tagged teaser as the demo's code pane ends on it, as HTML. */
export function heroMarkup(article: HeroArticle): string {
  return heroScript(article)
    .lines.map((line) => lineText(line.tokens))
    .join('\n');
}

/** The teaser's code pane as it ends, line by line. */
function heroCode(article: HeroArticle) {
  const indent = tok('  ', 'punct');
  return {
    open: [
      tok('<article', 'tag'),
      tok(' ', 'punct'),
      tok('class', 'attr'),
      tok('=', 'punct'),
      tok('"teaser"', 'str'),
    ],
    entity: [indent, ...ENTITY],
    impression: [indent, ...IMPRESSION],
    close: [tok('>', 'tag')],
    image: [
      indent,
      tok('<img', 'tag'),
      tok(' ', 'punct'),
      tok('src', 'attr'),
      tok('=', 'punct'),
      tok(`"/img/${article.thumb}.jpg"`, 'str'),
      tok(' ', 'punct'),
      tok('alt', 'attr'),
      tok('=', 'punct'),
      tok('""', 'str'),
      tok(' />', 'tag'),
    ],
    category: [
      indent,
      tok('<span', 'tag'),
      tok(' ', 'punct'),
      tok('class', 'attr'),
      tok('=', 'punct'),
      tok('"kicker"', 'str'),
      ...CATEGORY,
      tok('>', 'tag'),
      tok(article.kicker, 'text'),
      tok('</span>', 'tag'),
    ],
    title: [
      indent,
      tok('<h3', 'tag'),
      ...TITLE,
      tok('>', 'tag'),
      tok(article.title, 'text'),
      tok('</h3>', 'tag'),
    ],
    action: [
      indent,
      tok('<a', 'tag'),
      ...ACTION,
      tok('>', 'tag'),
      tok('Open →', 'text'),
      tok('</a>', 'tag'),
    ],
    end: [tok('</article>', 'tag')],
  };
}

/** One article's loop as a tagging script: the teaser typed, lit, clicked, and its two events. */
export function heroScript(article: HeroArticle): TaggingScript {
  const code = heroCode(article);
  const [impression, open] = heroEvents(article);
  const still = (id: keyof typeof code) => ({
    id,
    tokens: code[id],
    typeFrom: 0,
    typeTo: 0,
  });
  return {
    file: 'ArticleTeaser.html',
    loop: HERO_LOOP,
    lines: [
      still('open'),
      {
        id: 'entity',
        tokens: code.entity,
        typeFrom: CUE.entityStart,
        typeTo: CUE.entityEnd,
        showFrom: CUE.entityStart - 400,
      },
      {
        id: 'impression',
        tokens: code.impression,
        typeFrom: CUE.impressionStart,
        typeTo: CUE.impressionEnd,
        showFrom: CUE.impressionStart - 300,
      },
      still('close'),
      still('image'),
      {
        id: 'category',
        tokens: code.category,
        typeFrom: CUE.categoryStart,
        typeTo: CUE.categoryEnd,
        showFrom: CUE.categoryStart - 100,
        lights: 'category',
      },
      {
        id: 'title',
        tokens: code.title,
        typeFrom: CUE.titleStart,
        typeTo: CUE.titleEnd,
        showFrom: CUE.titleStart - 100,
        lights: 'title',
      },
      {
        id: 'action',
        tokens: code.action,
        typeFrom: CUE.actionStart,
        typeTo: CUE.actionEnd,
        showFrom: CUE.actionStart - 100,
        lights: 'action',
      },
      still('end'),
    ],
    card: {
      thumb: article.thumb,
      parts: [
        { id: 'category', text: article.kicker, role: 'kicker' },
        { id: 'title', text: article.title, role: 'title' },
        { id: 'action', text: 'Open →', role: 'action' },
      ],
    },
    events: [
      { ...impression, at: CUE.impressionEvent },
      { ...open, at: CUE.openEvent },
    ],
    click: { part: 'action', at: CUE.click },
  };
}

/** Earlier loops whose events the table still lists: it keeps 24 rows, two per loop. */
const PAST_LOOPS = 11;

/**
 * The hero's script for its `loop`-th loop (from 0): that loop's article, with
 * the earlier loops' events still in the table as events before the loop began.
 */
export function heroLoopScript(loop: number): TaggingScript {
  const script = heroScript(articleAt(loop));
  const past: TaggingEvent[] = [];
  for (let j = Math.max(0, loop - PAST_LOOPS); j < loop; j++)
    for (const event of heroScript(articleAt(j)).events)
      past.push({ ...event, at: event.at + (j - loop) * HERO_LOOP });
  return { ...script, events: [...past, ...script.events] };
}
