Hero demo: `data-elb` attributes are typed into an article teaser, the card lights up as each part is tagged, a cursor clicks it, and the events land in a live `walkerOS.events` table.

Sits under the hero CTAs, full container width. An 11.5s loop cycles three articles: entity (`data-elb`), impression action, category and title properties, click action, then the `article impression` and `article open` rows appear. Highlights use the event palette: entity green, action purple, property red.

**Consumer provides:** optional `playing` (default true), `speed` (default 1), `startAt` (ms into the loop, for a static frame).

Stays dark in both themes (`viz-*` tokens). Wraps below ~940px into a stacked layout. Respect reduced motion by passing `playing={false}` with a `startAt` around 9000 (all parts tagged, rows visible).
