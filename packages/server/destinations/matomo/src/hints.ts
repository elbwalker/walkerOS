import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'stale-event-needs-token': {
    text: 'Matomo refuses a request whose event time (cdt) is more than a day old unless the bulk body carries token_auth. Without credentials.token such an event, for example a late or replayed one, is counted invalid by Matomo and the push fails with its counts (0 of 1 tracking requests, 1 invalid). The event time comes from the clock of the device, so a fresh event from a device whose clock is more than a day behind (or, on Matomo 6, more than a day ahead) fails the same way. Set credentials.token, or timestamp: false to let Matomo use the time it receives the request. A simulation sends no request, so it shows the call Matomo would refuse.',
  },
  'queued-tracking': {
    text: 'With the QueuedTracking plugin, Matomo queues the bulk request and answers before tracking it, without tracking counts (an empty body or its 1x1 GIF). Such a push counts as delivered, and a request Matomo refuses later cannot be reported. The destination writes one WARN line per minute with code unconfirmed, which the default log level (ERROR) does not show.',
  },
  'several-sites': {
    text: 'One step serves several sites when url and siteId are value configs resolved per event against { ingest, event }. A fn map of the page host sends each shop to its own Matomo and site ID. An event whose host is not in the map fails with missing-input, naming siteId or url.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            settings: {
              url: {
                fn: "$code:(_, context) => context.event.source.url && ({ 'shop-a.example': 'https://a.matomo.example/', 'shop-b.example': 'https://b.matomo.example/' })[new URL(context.event.source.url).hostname]",
              },
              siteId: {
                fn: "$code:(_, context) => context.event.source.url && ({ 'shop-a.example': '1', 'shop-b.example': '2' })[new URL(context.event.source.url).hostname]",
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
};
