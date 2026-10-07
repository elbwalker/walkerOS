/**
 * The article teaser demo's script: one ArticleTeaser tagged once, walked from
 * atom to page templates. The code pane, the cards, the page HTML and the
 * expected events all come from the constants below, so a fidelity test that
 * runs the page HTML through walkerOS checks what the cards show.
 */
import { tok, type CodeToken, type EventPart } from '../parts/tokens';

export type TeaserStep = 1 | 2 | 3 | 4 | 5;
export type TeaserPageId = 'home' | 'article';

/** What reaching a code line adds to the cards. */
export type TeaserEffect =
  | 'action'
  | 'entity'
  | 'position'
  | 'image'
  | 'category'
  | 'title'
  | 'homefeed'
  | 'related'
  | 'homepage'
  | 'articlepage';

export interface TeaserFile {
  readonly kind: 'file';
  readonly step: TeaserStep;
  readonly name: string;
  readonly level: 'atom' | 'molecule' | 'organism' | 'template';
}

export interface TeaserCode {
  readonly kind: 'code';
  readonly step: TeaserStep;
  readonly tokens: readonly CodeToken[];
  readonly effect?: TeaserEffect;
  /** The event part this line tags: its bar and highlight colour. */
  readonly part?: EventPart;
}

export type TeaserItem = TeaserFile | TeaserCode;

export interface TeaserArticle {
  readonly kicker: string;
  readonly title: string;
}

export interface TeaserPage {
  readonly template: string;
  readonly organism: string;
  readonly pagetype: string;
  readonly list: string;
  /** The list variable the organism maps over. */
  readonly items: string;
  readonly step: TeaserStep;
  readonly listEffect: TeaserEffect;
  readonly globalsEffect: TeaserEffect;
  readonly header: string;
  readonly heading?: string;
  readonly articles: readonly TeaserArticle[];
}

export interface TeaserExpectation {
  readonly position: number;
  readonly category: string;
  readonly title: string;
  readonly list: string;
  readonly pagetype: string;
}

export interface TeaserAdvance {
  readonly next: number;
  /** The wait before the following advance; null when the walk-through is done. */
  readonly delay: number | null;
}

export const TEASER_ENTITY = 'article';
export const TEASER_ACTION = 'click:open';

export const TEASER_PAGE_IDS: readonly TeaserPageId[] = ['home', 'article'];

export const TEASER_PAGES: Readonly<Record<TeaserPageId, TeaserPage>> = {
  home: {
    template: 'HomePage.tsx',
    organism: 'HomeFeed',
    pagetype: 'homepage',
    list: 'homefeed',
    items: 'stories',
    step: 3,
    listEffect: 'homefeed',
    globalsEffect: 'homepage',
    header: '<HomeFeed /> · homepage',
    articles: [
      { kicker: 'Tech', title: 'Return of the Bug' },
      { kicker: 'Tech', title: 'The quiet return of RSS' },
      { kicker: 'Food', title: 'Why sourdough came back' },
    ],
  },
  article: {
    template: 'ArticlePage.tsx',
    organism: 'RelatedStories',
    pagetype: 'article',
    list: 'related',
    items: 'related',
    step: 4,
    listEffect: 'related',
    globalsEffect: 'articlepage',
    header: '<RelatedStories /> · article page',
    heading: 'Related stories',
    articles: [
      { kicker: 'Tech', title: 'The quiet return of RSS' },
      { kicker: 'Science', title: 'A year on the ice shelf' },
      { kicker: 'Culture', title: 'Small venues, big nights' },
    ],
  },
};

export const TEASER_STEPS: ReadonlyArray<{
  readonly step: TeaserStep;
  readonly label: string;
}> = [
  { step: 1, label: 'Atom' },
  { step: 2, label: 'Molecule' },
  { step: 3, label: TEASER_PAGES.home.organism },
  { step: 4, label: TEASER_PAGES.article.organism },
  { step: 5, label: 'Pages' },
];

export const TEASER_CAPTIONS: Readonly<Record<TeaserStep, string>> = {
  1: `Link carries the ${TEASER_ACTION} action wherever it is rendered.`,
  2: `ArticleTeaser makes each card an ${TEASER_ENTITY} entity and reads category and title from its elements.`,
  3: `${TEASER_PAGES.home.organism} wraps three teasers and adds list:${TEASER_PAGES.home.list} context to their events.`,
  4: `${TEASER_PAGES.article.organism} reuses the same ArticleTeaser and adds list:${TEASER_PAGES.article.list} context.`,
  5: 'Each page template sets pagetype as a global, which is added to every event on that page.',
};

const file = (
  step: TeaserStep,
  name: string,
  level: TeaserFile['level'],
): TeaserFile => ({
  kind: 'file',
  step,
  name,
  level,
});

const code = (
  step: TeaserStep,
  tokens: CodeToken[],
  effect?: TeaserEffect,
  part?: EventPart,
): TeaserCode => ({ kind: 'code', step, tokens, effect, part });

const PROPERTY = `data-elb-${TEASER_ENTITY}`;

function buildItems(): TeaserItem[] {
  const items: TeaserItem[] = [
    file(1, 'Link.tsx', 'atom'),
    code(1, [
      tok('export const', 'kw'),
      tok(' Link ', 'text'),
      tok('= ({ href, children }) => (', 'punct'),
    ]),
    code(
      1,
      [
        tok('  ', 'punct'),
        tok('<a', 'tag'),
        tok(' ', 'punct'),
        tok('href', 'attr'),
        tok('={href} ', 'punct'),
        tok('data-elbaction', 'attr', 'action'),
        tok('=', 'punct'),
        tok(`"${TEASER_ACTION}"`, 'str', 'action'),
        tok('>', 'tag'),
      ],
      'action',
      'action',
    ),
    code(1, [tok('    ', 'punct'), tok('{children}', 'punct')]),
    code(1, [tok('  ', 'punct'), tok('</a>', 'tag')]),
    code(1, [tok(');', 'punct')]),
    file(2, 'ArticleTeaser.tsx', 'molecule'),
    code(2, [
      tok('export const', 'kw'),
      tok(' ArticleTeaser ', 'text'),
      tok('= ({', 'punct'),
    ]),
    code(2, [tok('  title, category, image, url, position,', 'punct')]),
    code(2, [tok('}) => (', 'punct')]),
    code(
      2,
      [
        tok('  ', 'punct'),
        tok('<article', 'tag'),
        tok(' ', 'punct'),
        tok('data-elb', 'attr', 'entity'),
        tok('=', 'punct'),
        tok(`"${TEASER_ENTITY}"`, 'str', 'entity'),
      ],
      'entity',
      'entity',
    ),
    code(
      2,
      [
        tok('    ', 'punct'),
        tok(PROPERTY, 'attr', 'property'),
        tok('={`', 'punct'),
        tok('position:${position}', 'str', 'property'),
        tok('`}', 'punct'),
        tok('>', 'tag'),
      ],
      'position',
      'property',
    ),
    code(
      2,
      [
        tok('    ', 'punct'),
        tok('<img', 'tag'),
        tok(' ', 'punct'),
        tok('src', 'attr'),
        tok('={image} ', 'punct'),
        tok('/>', 'tag'),
      ],
      'image',
    ),
    code(
      2,
      [
        tok('    ', 'punct'),
        tok('<span', 'tag'),
        tok(' ', 'punct'),
        tok(PROPERTY, 'attr', 'property'),
        tok('=', 'punct'),
        tok('"category:#innerText"', 'str', 'property'),
        tok('>', 'tag'),
        tok('{category}', 'punct'),
        tok('</span>', 'tag'),
      ],
      'category',
      'property',
    ),
    code(
      2,
      [
        tok('    ', 'punct'),
        tok('<h3', 'tag'),
        tok(' ', 'punct'),
        tok(PROPERTY, 'attr', 'property'),
        tok('=', 'punct'),
        tok('"title:#innerText"', 'str', 'property'),
        tok('>', 'tag'),
        tok('{title}', 'punct'),
        tok('</h3>', 'tag'),
      ],
      'title',
      'property',
    ),
    code(2, [
      tok('    ', 'punct'),
      tok('<Link', 'tag'),
      tok(' ', 'punct'),
      tok('href', 'attr'),
      tok('={url}', 'punct'),
      tok('>', 'tag'),
      tok('Open →', 'text'),
      tok('</Link>', 'tag'),
    ]),
    code(2, [tok('  ', 'punct'), tok('</article>', 'tag')]),
    code(2, [tok(');', 'punct')]),
  ];
  for (const id of TEASER_PAGE_IDS) {
    const page = TEASER_PAGES[id];
    items.push(
      file(page.step, `${page.organism}.tsx`, 'organism'),
      code(
        page.step,
        [
          tok('<section', 'tag'),
          tok(' ', 'punct'),
          tok('data-elbcontext', 'attr', 'context'),
          tok('=', 'punct'),
          tok(`"list:${page.list}"`, 'str', 'context'),
          tok('>', 'tag'),
        ],
        page.listEffect,
        'context',
      ),
      code(page.step, [
        tok(`  {${page.items}.map((s, i) => `, 'punct'),
        tok('<ArticleTeaser', 'tag'),
        tok(' {...s} ', 'punct'),
        tok('position', 'attr'),
        tok('={i + 1} ', 'punct'),
        tok('/>', 'tag'),
        tok(')}', 'punct'),
      ]),
      code(page.step, [tok('</section>', 'tag')]),
    );
  }
  for (const id of TEASER_PAGE_IDS) {
    const page = TEASER_PAGES[id];
    items.push(
      file(5, page.template, 'template'),
      code(
        5,
        [
          tok('<main', 'tag'),
          tok(' ', 'punct'),
          tok('data-elbglobals', 'attr', 'globals'),
          tok('=', 'punct'),
          tok(`"pagetype:${page.pagetype}"`, 'str', 'globals'),
          tok('>', 'tag'),
        ],
        page.globalsEffect,
        'globals',
      ),
      code(5, [tok('  ', 'punct'), tok(`<${page.organism} />`, 'tag')]),
      code(5, [tok('</main>', 'tag')]),
    );
  }
  return items;
}

export const TEASER_ITEMS: readonly TeaserItem[] = buildItems();

function hasEffect(item: TeaserItem): boolean {
  return item.kind === 'code' && item.effect !== undefined;
}

/** Index of the first item of `step`. */
export function teaserStepStart(step: TeaserStep): number {
  return TEASER_ITEMS.findIndex((item) => item.step === step);
}

/** Index after the last item of `step`. */
export function teaserStepEnd(step: TeaserStep): number {
  let end = teaserStepStart(step);
  while (end < TEASER_ITEMS.length && TEASER_ITEMS[end].step === step) end += 1;
  return end;
}

/**
 * Autoplay: from `n` shown items, the next count to show and the wait before
 * the step after it. A new file opens alone; otherwise the walk runs to the
 * next line with an effect. A pause marks the move to the next step.
 */
export function teaserAdvance(n: number): TeaserAdvance | null {
  if (n >= TEASER_ITEMS.length) return null;
  const item = TEASER_ITEMS[n];
  if (
    item.kind === 'file' &&
    (n === 0 || TEASER_ITEMS[n - 1].step !== item.step)
  )
    return { next: n + 1, delay: 1300 };
  let next = n;
  while (
    next < TEASER_ITEMS.length &&
    TEASER_ITEMS[next].step === item.step &&
    !hasEffect(TEASER_ITEMS[next])
  )
    next += 1;
  if (next < TEASER_ITEMS.length && TEASER_ITEMS[next].step === item.step)
    next += 1;
  if (next >= TEASER_ITEMS.length) return { next, delay: null };
  return {
    next,
    delay: 1700 + (TEASER_ITEMS[next].step !== item.step ? 1600 : 0),
  };
}

/** A page template's HTML as walkerOS sees it, built from the same constants as the cards. */
export function teaserPageHtml(id: TeaserPageId): string {
  const page = TEASER_PAGES[id];
  const cards = page.articles.map((article, index) =>
    [
      `    <article data-elb="${TEASER_ENTITY}" ${PROPERTY}="position:${index + 1}">`,
      '      <img alt="" />',
      `      <span ${PROPERTY}="category:#innerText">${article.kicker}</span>`,
      `      <h3 ${PROPERTY}="title:#innerText">${article.title}</h3>`,
      `      <a href="#" data-elbaction="${TEASER_ACTION}">Open →</a>`,
      '    </article>',
    ].join('\n'),
  );
  return [
    `<main data-elbglobals="pagetype:${page.pagetype}">`,
    `  <section data-elbcontext="list:${page.list}">`,
    ...cards,
    '  </section>',
    '</main>',
  ].join('\n');
}

/** Per card on a page, what the demo shows: position pill, kicker, title, list and pagetype pills. */
export function teaserExpectations(id: TeaserPageId): TeaserExpectation[] {
  const page = TEASER_PAGES[id];
  return page.articles.map((article, index) => ({
    position: index + 1,
    category: article.kicker,
    title: article.title,
    list: page.list,
    pagetype: page.pagetype,
  }));
}
