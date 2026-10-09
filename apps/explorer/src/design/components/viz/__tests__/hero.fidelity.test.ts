import { getEvents, Triggers } from '@walkeros/web-source-browser';
import { HERO_ARTICLES, heroEvents, heroMarkup } from '../data/hero';
import { defineInnerText, flushChain, mount, record, stop } from './fidelity';

// The hero types walkerOS attributes into a teaser and shows the events in a
// table. This hands the markup it ends on to the real browser source and
// collector, and compares what walkerOS produces with what the table shows.
beforeAll(defineInnerText);

describe.each(
  HERO_ARTICLES.map((article) => [article.title, article] as const),
)('%s', (_title, article) => {
  it('a click on Open sends the event the table shows', async () => {
    const recording = await record(mount(heroMarkup(article)));
    recording.container.querySelector('a')?.click();
    await flushChain();
    const [, open] = heroEvents(article);
    expect(
      recording.events.map((event) => ({
        name: event.name,
        entity: event.entity,
        action: event.action,
        data: event.data,
        trigger: event.trigger,
      })),
    ).toEqual([
      {
        name: open.name,
        entity: 'article',
        action: 'open',
        data: open.data,
        trigger: 'click',
      },
    ]);
    // The table prints the data in this order: walkerOS's (DOM order).
    expect(Object.keys(recording.events[0]?.data ?? {})).toEqual(
      Object.keys(open.data),
    );
    await stop(recording);
  });

  it('the impression is the event the table shows', () => {
    const element = mount(heroMarkup(article)).querySelector('article');
    expect(element).not.toBeNull();
    const [impression] = heroEvents(article);
    expect(
      (element ? getEvents(element, Triggers.Impression) : []).map((entry) => ({
        name: `${entry.entity} ${entry.action}`,
        data: entry.data,
      })),
    ).toEqual([{ name: impression.name, data: impression.data }]);
  });
});
