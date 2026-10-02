import type { RoleContent } from '../roles';

const content: RoleContent = {
  slug: 'tracking-specialists',
  meta: {
    title: 'walkerOS for GTM and GA4 tracking specialists',
    description:
      'GTM tags, triggers and variables translated to walkerOS. Keep your container and GA4, move tagging into the markup, and test changes before they go live.',
  },
  hero: {
    headline: 'Your GTM triggers work until someone changes the page',
    lede: 'walkerOS becomes the collection layer under GTM, and tagging moves into your markup as `data-elb` attributes that change in the same pull request as the page. Marketing keeps adding tags in the GTM interface it already knows, and GTM receives every event as one destination.',
    primary: {
      label: 'Compare walkerOS with GTM',
      href: '/docs/comparisons/gtm/',
    },
    secondary: {
      label: 'Send your first GA4 event',
      href: '/docs/getting-started/ga4-ecommerce',
    },
  },
  situations: {
    headline: 'Problems you have probably chased in GTM',
    items: [
      {
        claim:
          'The redesign goes live, the button moves, and the CSS-selector trigger built for the old markup stops firing. Nobody notices until someone asks where the conversions went.',
        witness:
          'With `data-elb` attributes the tagging sits on the element itself, so it moves with the component and shows up in the same code review as the redesign. [HTML attribute tagging](/docs/sources/web/browser/tagging/html-attributes) shows the syntax.',
      },
      {
        claim:
          'The single-page app changes route, and `page_view` either never fires or fires twice once a History Change trigger meets Enhanced Measurement.',
        witness:
          "Your router calls `elb('walker run')` on each route change, and that call sends the page view. Set `pageview: false` on the GA4 destination and turn off history-based page views in Enhanced Measurement, so gtag doesn't send a second one. See [virtual pageviews in SPAs](/docs/sources/web/browser/commands#virtual-pageviews-in-spas).",
      },
      {
        claim:
          "A tag reads a dataLayer value that hasn't been pushed yet and sends `undefined`. It works in preview and loses data on your fastest pages.",
        witness:
          "With `data-elb` tagging, the event is built from the element's attributes at the moment the click, load or visible trigger fires, so it never waits on an earlier push. Calls made before walkerOS loads are queued and processed in order. The [dataLayer source](/docs/sources/web/dataLayer) is the exception: it sees pushes in whatever order your site sends them.",
      },
      {
        claim:
          "Consent Mode v2 left you guessing between basic and advanced, and you can't say for sure what fires when someone clicks reject.",
        witness:
          'Each destination names the consent it needs in its config, and its events wait in a queue until that consent is granted, so what fires on reject is config you can read. See [consent management](/docs/guides/consent).',
      },
    ],
  },
  changes: [
    {
      kicker: 'Migration path',
      headline: 'Your existing dataLayer keeps working while you switch',
      body: "You don't have to re-tag the site first. The dataLayer source wraps `dataLayer.push`: each push becomes a walkerOS event and then goes on to the original push, so GTM sees exactly what it saw before. You add `data-elb` attributes page by page, as your releases allow.",
      code: `{
  "sources": {
    "dataLayer": {
      "package": "@walkeros/web-source-datalayer",
      "config": {
        "settings": { "prefix": "dataLayer" },
        "mapping": {
          "dataLayer": {
            "purchase": {
              "name": "order complete",
              "data": {
                "map": {
                  "id": "transaction_id",
                  "total": "value",
                  "currency": "currency"
                }
              }
            }
          }
        }
      }
    }
  }
}`,
      caption:
        'Your existing `purchase` push becomes an `order complete` event. The push itself stays as it is, and so does every GTM tag listening for it.',
    },
    {
      kicker: 'Data quality',
      headline: 'An event that fails its contract can stop before GA4',
      body: 'walkerOS can drop an event that breaks its contract before any destination, GA4 included, receives it. A developer writes the contract as JSON Schema in the flow config. In `strict` mode a failing event stops at the validate step. In `pass` mode it carries on with the verdict written onto it, and a later step can route on that.',
      code: `{
  "transformers": {
    "validate": {
      "package": "@walkeros/transformer-validate",
      "config": {
        "settings": { "contract": ["$contract.web"], "mode": "strict" }
      },
      "next": "ga4"
    }
  }
}`,
      caption:
        'In `strict` mode, an event that fails `$contract.web` stops here and never reaches `ga4`.',
    },
    {
      kicker: 'Consent',
      headline: 'The gtag destination sends your Consent Mode signals',
      body: "Every event carries a `consent` object, and each destination names the consent it needs in `config.consent`. Until that consent is granted, the destination's events wait in a queue. The gtag destination sends Consent Mode's denied `consent default` before GA4's `config` call and a `consent update` whenever consent changes, and `como_advanced: true` switches it to advanced mode.",
      code: `elb('walker consent', { functional: true, marketing: false });`,
      caption:
        'The command a CMP source sends for you. Queued events then go out with the updated consent state.',
    },
  ],
  fit: {
    headline: 'What you keep, and what your GTM habits turn into',
    stays: [
      'GTM and the tags marketing adds there. If the container is already on the page, leave `loadScript` unset and the [GTM destination](/docs/destinations/web/gtag/gtm) pushes into its dataLayer without loading it again',
      'Your GA4 property, its reports and DebugView',
      'Your existing `dataLayer.push` calls, picked up by the dataLayer source',
      'Your CMP and the banner visitors already see, connected through a [CMP source](/docs/sources/web/cmps) or the `walker consent` command',
    ],
    changes: [
      'Tags become destinations: GA4, Google Ads and GTM are settings on one [gtag destination](/docs/destinations/web/gtag/)',
      'Triggers become attributes on the element, such as `data-elbaction="click:select"`',
      "Variables become mapping: `value: 'data.price'` turns a product price into GA4's `value`",
      "Preview mode becomes the CLI's `--simulate` flag before deploy, and [Observe](/docs/getting-started/observe) once the flow runs",
      'Publish becomes a config change with a diff and a reviewer',
    ],
    firstStep:
      'Start with the dataLayer source next to your current setup. Nothing you send today has to change.',
  },
  limits: [
    'No template gallery. GTM has hundreds of vendor-maintained tag templates, while a walkerOS destination is a config entry someone writes and reviews.',
    "No point-and-click preview pane. You check your work with the CLI's `--simulate` flag and Observe sessions.",
    "`data-elb` attributes live in the site's code. If you can't change the markup yourself, you start with the dataLayer source and need a developer for the attributes.",
    'A developer writes the contract. walkerOS does not build one from your tracking plan.',
    'Config changes go through review, which is slower than clicking Publish in GTM.',
  ],
  questions: [
    {
      question:
        "If we switch off GTM, don't we lose the point-and-click tagging that lets marketing add tags without a developer?",
      answer:
        "You don't have to switch it off. walkerOS becomes the collection layer and GTM one of its destinations, so marketing keeps adding tags in the interface it knows, fed by the same events. GTM stops carrying the collection logic: the custom HTML, hand-rolled consent checks and workarounds that pile up when the container is the only place data gets shaped. The [GTM destination](/docs/destinations/web/gtag/gtm) page shows how to feed a container that is already on the page.",
    },
    {
      question:
        "GTM is free. What does walkerOS cost me to run? Don't I need servers now, and someone to look after them?",
      answer:
        'On the web, both are free: GTM costs nothing, and walkerOS is open source and runs in the browser. Server-side, both cost money, because a GTM server container also runs on infrastructure you rent. What differs is what the money buys: GTM is closed, so you pay for workarounds once the standard setup runs out, while walkerOS is open and your own developers can extend it. The [cost section of the GTM comparison](/docs/comparisons/gtm/#cost) covers both.',
    },
    {
      question:
        'GTM has a preview mode. How do I test what walkerOS collects before it goes live?',
      answer:
        "Run the CLI's `push` command with `--simulate`: it sends a real event through your exact flow config with the destinations mocked, before anything deploys. Because it is a command, it can run in CI on every change. Once the flow is live, an Observe session in the hosted app shows events as they arrive, and a self-hosted setup can stream the same records to its own endpoint through `observers`. The [Observe page](/docs/getting-started/observe) covers both.",
    },
    {
      question:
        'Our tracking is DOM-based in GTM and mostly works. What actually changes when we switch, and what do we keep?',
      answer:
        "You keep your `dataLayer.push` calls, and you add `data-elb` attributes over time instead of switching in one go. What changes is how tracking breaks. A CSS-selector trigger depends on markup it doesn't own, so a template change can break it without anyone noticing, while an attribute on the element gets changed and reviewed together with that element. The [dataLayer source](/docs/sources/web/dataLayer#migration-strategy) lays out the migration in three phases.",
    },
  ],
  next: {
    headline: 'Start with the comparison, then send a real event',
    links: [
      {
        label: 'Compare walkerOS with GTM',
        href: '/docs/comparisons/gtm/',
        note: 'Where the two differ, where GTM still wins, and how to run both together.',
      },
      {
        label: 'Send your first GA4 event',
        href: '/docs/getting-started/ga4-ecommerce',
        note: 'A short walkthrough from a page view to a mapped add_to_cart event.',
      },
      {
        label: 'Bridge your existing dataLayer',
        href: '/docs/sources/web/dataLayer',
        note: 'Pick up the dataLayer.push calls you already have before you re-tag anything.',
      },
    ],
  },
};

export default content;
