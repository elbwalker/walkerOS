import {
  TEASER_PAGE_IDS,
  teaserExpectations,
  teaserPageHtml,
} from '../data/article-teaser';
import { defineInnerText, flushChain, mount, record, stop } from './fidelity';

// The teaser demo shows, per card, the entity, its position, kicker and title,
// the list context and the page's globals. This runs each page's HTML through
// the real browser source and collector and compares. Each page gets its own
// scope: globals are read from the whole scope, as on two real pages.
beforeAll(defineInnerText);

it.each(TEASER_PAGE_IDS.map((id) => [id]))(
  'every card on the %s page sends what the demo shows',
  async (id) => {
    const recording = await record(mount(teaserPageHtml(id)));
    const links = Array.from(recording.container.querySelectorAll('a'));
    for (const link of links) link.click();
    await flushChain();
    const expected = teaserExpectations(id);
    expect(links).toHaveLength(expected.length);
    expect(
      recording.events.map((event) => ({
        name: event.name,
        data: event.data,
        list: event.context.list,
        pagetype: event.globals.pagetype,
      })),
    ).toEqual(
      expected.map((card) => ({
        name: 'article open',
        data: {
          position: card.position,
          category: card.category,
          title: card.title,
        },
        list: [card.list, 0],
        pagetype: card.pagetype,
      })),
    );
    await stop(recording);
  },
);
