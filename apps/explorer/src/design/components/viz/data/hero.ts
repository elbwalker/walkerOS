/**
 * The hero demo's script: walkerOS attributes typed into an article teaser, the
 * card lighting up per tagged part, a click, and the events in a live table.
 * heroMarkup() is the tagged markup the demo ends on, and heroEvents() what
 * walkerOS makes of it; a fidelity test runs the one through walkerOS and
 * compares with the other. Imports only package-free demo parts.
 */
import { clamp, ease } from '../parts/timeline';
import {
  lineText,
  tok,
  truncate,
  typedLength,
  type CodeToken,
} from '../parts/tokens';
import type { ThumbKind } from '../parts/Thumb';

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
  slideInStart: 0,
  slideInEnd: 500,
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
  moveStart: 6900,
  moveEnd: 7700,
  click: 7850,
  openEvent: 8000,
  fadeOut: 10600,
  slideOutStart: 10800,
  slideOutEnd: 11400,
};

const MAX_ROWS = 24;
const PAST = 10000;

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

type Slot = 'entity' | 'impression' | 'category' | 'title' | 'action';

const TYPING: ReadonlyArray<readonly [number, number]> = [
  [CUE.entityStart, CUE.entityEnd],
  [CUE.impressionStart, CUE.impressionEnd],
  [CUE.categoryStart, CUE.categoryEnd],
  [CUE.titleStart, CUE.titleEnd],
  [CUE.actionStart, CUE.actionEnd],
];

export interface HeroLine {
  readonly id: string;
  readonly n: number;
  readonly tokens: readonly CodeToken[];
  readonly on: boolean;
  /** How many tokens stand before the caret; null without a caret. */
  readonly caret: number | null;
}

export interface HeroEvent {
  readonly name: string;
  readonly data: Readonly<Record<string, string>>;
}

export interface HeroRow extends HeroEvent {
  readonly key: string;
  readonly age: number;
}

export interface HeroFrame {
  readonly article: HeroArticle;
  readonly lines: readonly HeroLine[];
  readonly fade: number;
  readonly caretOn: boolean;
  readonly card: {
    readonly opacity: number;
    readonly offset: number;
    readonly entity: boolean;
    readonly impression: boolean;
    readonly category: boolean;
    readonly title: boolean;
    readonly action: boolean;
  };
  readonly cursor: {
    readonly x: number;
    readonly y: number;
    readonly opacity: number;
    readonly ring: number;
    readonly ringOpacity: number;
    readonly pressed: boolean;
  };
  readonly rows: readonly HeroRow[];
}

function articleAt(loop: number): HeroArticle {
  return HERO_ARTICLES[loop % HERO_ARTICLES.length];
}

function caretSlot(ph: number): Slot | null {
  if (ph >= CUE.entityStart - 400 && ph < CUE.impressionStart - 300)
    return 'entity';
  if (ph >= CUE.impressionStart - 300 && ph < CUE.categoryStart - 100)
    return 'impression';
  if (ph >= CUE.categoryStart - 100 && ph < CUE.titleStart - 100)
    return 'category';
  if (ph >= CUE.titleStart - 100 && ph < CUE.actionStart - 100) return 'title';
  if (ph >= CUE.actionStart - 100 && ph < CUE.moveStart) return 'action';
  return null;
}

function typed(
  tokens: readonly CodeToken[],
  start: number,
  end: number,
  ph: number,
): CodeToken[] {
  return truncate(
    tokens,
    Math.round(clamp((ph - start) / (end - start)) * typedLength(tokens)),
  );
}

/** The code pane's lines at phase `ph` of an article's loop. */
function heroLines(article: HeroArticle, ph: number): HeroLine[] {
  const slot = caretSlot(ph);
  const indent = tok('  ', 'punct');
  const entity = typed(ENTITY, CUE.entityStart, CUE.entityEnd, ph);
  const impression = typed(
    IMPRESSION,
    CUE.impressionStart,
    CUE.impressionEnd,
    ph,
  );
  const category = typed(CATEGORY, CUE.categoryStart, CUE.categoryEnd, ph);
  const title = typed(TITLE, CUE.titleStart, CUE.titleEnd, ph);
  const action = typed(ACTION, CUE.actionStart, CUE.actionEnd, ph);
  const lines: Array<Omit<HeroLine, 'n'> | null> = [
    {
      id: 'open',
      tokens: [
        tok('<article', 'tag'),
        tok(' ', 'punct'),
        tok('class', 'attr'),
        tok('=', 'punct'),
        tok('"teaser"', 'str'),
      ],
      on: false,
      caret: null,
    },
    ph >= CUE.entityStart - 400
      ? {
          id: 'entity',
          tokens: [indent, ...entity],
          on: true,
          caret: slot === 'entity' ? 1 + entity.length : null,
        }
      : null,
    ph >= CUE.impressionStart - 300
      ? {
          id: 'impression',
          tokens: [indent, ...impression],
          on: true,
          caret: slot === 'impression' ? 1 + impression.length : null,
        }
      : null,
    { id: 'close', tokens: [tok('>', 'tag')], on: false, caret: null },
    {
      id: 'image',
      tokens: [
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
      on: false,
      caret: null,
    },
    {
      id: 'category',
      tokens: [
        indent,
        tok('<span', 'tag'),
        tok(' ', 'punct'),
        tok('class', 'attr'),
        tok('=', 'punct'),
        tok('"kicker"', 'str'),
        ...category,
        tok('>', 'tag'),
        tok(article.kicker, 'text'),
        tok('</span>', 'tag'),
      ],
      on: ph >= CUE.categoryStart - 100,
      caret: slot === 'category' ? 6 + category.length : null,
    },
    {
      id: 'title',
      tokens: [
        indent,
        tok('<h3', 'tag'),
        ...title,
        tok('>', 'tag'),
        tok(article.title, 'text'),
        tok('</h3>', 'tag'),
      ],
      on: ph >= CUE.titleStart - 100,
      caret: slot === 'title' ? 2 + title.length : null,
    },
    {
      id: 'action',
      tokens: [
        indent,
        tok('<a', 'tag'),
        ...action,
        tok('>', 'tag'),
        tok('Open →', 'text'),
        tok('</a>', 'tag'),
      ],
      on: ph >= CUE.actionStart - 100,
      caret: slot === 'action' ? 2 + action.length : null,
    },
    { id: 'end', tokens: [tok('</article>', 'tag')], on: false, caret: null },
  ];
  return lines
    .filter((line): line is Omit<HeroLine, 'n'> => line !== null)
    .map((line, index) => ({ ...line, n: index + 1 }));
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
  return heroLines(article, CUE.moveStart)
    .map((line) => lineText(line.tokens))
    .join('\n');
}

function heroRows(loop: number, ph: number): HeroRow[] {
  const rows: HeroRow[] = [];
  for (let j = loop; j >= 0 && rows.length < MAX_ROWS; j--) {
    const [impression, open] = heroEvents(articleAt(j));
    const current = j === loop;
    if (!current || ph >= CUE.openEvent)
      rows.push({
        ...open,
        key: `${j}-open`,
        age: current ? ph - CUE.openEvent : PAST,
      });
    if (!current || ph >= CUE.impressionEvent)
      rows.push({
        ...impression,
        key: `${j}-impression`,
        age: current ? ph - CUE.impressionEvent : PAST,
      });
  }
  return rows.slice(0, MAX_ROWS);
}

/** Everything the hero demo shows at time `t` (ms since the first loop began). */
export function heroFrame(t: number): HeroFrame {
  const loop = Math.floor(t / HERO_LOOP);
  const ph = t - loop * HERO_LOOP;
  const article = articleAt(loop);
  const slideIn = ease(
    clamp((ph - CUE.slideInStart) / (CUE.slideInEnd - CUE.slideInStart)),
  );
  const slideOut = ease(
    clamp((ph - CUE.slideOutStart) / (CUE.slideOutEnd - CUE.slideOutStart)),
  );
  const move = ease(
    clamp((ph - CUE.moveStart) / (CUE.moveEnd - CUE.moveStart)),
  );
  const ripple = clamp((ph - CUE.click) / 550);
  const cursorShown = ph >= CUE.moveStart - 200 && ph < CUE.fadeOut + 200;
  const fadingOut = ph > CUE.fadeOut ? 1 - clamp((ph - CUE.fadeOut) / 200) : 1;
  return {
    article,
    lines: heroLines(article, ph),
    fade:
      ph < 250
        ? ph / 250
        : ph > CUE.fadeOut
          ? 1 - clamp((ph - CUE.fadeOut) / (HERO_LOOP - CUE.fadeOut - 150))
          : 1,
    caretOn:
      TYPING.some(([start, end]) => ph >= start && ph <= end) || ph % 900 < 500,
    card: {
      opacity: clamp(ph / 250) * (1 - slideOut),
      offset: ph >= CUE.slideOutStart ? -slideOut * 190 : (1 - slideIn) * 190,
      entity: ph >= CUE.entityEnd,
      impression: ph >= CUE.impressionEnd,
      category: ph >= CUE.categoryEnd,
      title: ph >= CUE.titleEnd,
      action: ph >= CUE.actionEnd,
    },
    cursor: {
      x: 22 + (1 - move) * 190,
      y: 11 - (1 - move) * 80,
      opacity: cursorShown
        ? clamp((ph - (CUE.moveStart - 200)) / 200) * fadingOut
        : 0,
      ring: 1 + ripple * 1.8,
      ringOpacity: ph >= CUE.click ? (1 - ripple) * 0.9 : 0,
      pressed: ph >= CUE.click && ph < CUE.click + 180,
    },
    rows: heroRows(loop, ph),
  };
}
