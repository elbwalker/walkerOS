<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="300px"/>
  </a>
</p>

# @TODO
- update .github actions
- add pnpm support
- create core package
- install https://turbo.build/repo/docs/installing
- update dir path for each package and other links

# walker.js

Walker.js is a first-party event tracker for simplified and compliant data collection. Standardized, agnostic & flexible. With walker.js you can capture user events in the browser and send them to any destination - just by setting HTML attributes. Become independent from locked-in analytics systems and set up reliable tracking the moment you design your front end.

[Request Feature](https://github.com/elbwalker/walker.js/issues/new) · [Report Bug](https://github.com/elbwalker/walker.js/issues/new) · [Say hello](https://calendly.com/elb-alexander/30min)

<div align="left">
  <img src="https://img.shields.io/github/license/elbwalker/walker.js" />
  <img src="https://img.shields.io/github/languages/top/elbwalker/walker.js" />
  <img src="https://img.shields.io/github/size/elbwalker/walker.js/dist/walker.js" />
  <a href="https://docs.elbwalker.com/"><img src="https://img.shields.io/badge/docs-docs.elbwalker.com-yellow" alt="elbwalker Documentation"></a>
</div>

## 🤓 Usage

You can implement all sorts of front-end user events. From product and UX events like "promotion view", or filter usage, etc. to e-commerce actions like product add to carts or order complete events. The walker.js handles all [trigger initializations](https://docs.elbwalker.com/tagging/available-triggers) and race conditions, builds the [events with context](https://docs.elbwalker.com/tagging/basics), and distributes them based on [consent states](https://docs.elbwalker.com/privacy/consent) and [mapping definitions](https://docs.elbwalker.com/destinations/basics#mapping) to any [destinations](https://docs.elbwalker.com/destinations/details).

To get started take a look at our detailed [documentation](https://docs.elbwalker.com/).

1. [Installation](https://docs.elbwalker.com/getting-started/installation)
2. [Tagging](https://docs.elbwalker.com/tagging/basics)
3. [Destinations](https://docs.elbwalker.com/destinations/basics)
4. [Consent](https://docs.elbwalker.com/privacy/consent)

### Basic example

Tagging a page with

```html
<body data-elbglobals="language:en">
  <div data-elbcontext="test:engagement">
    <div data-elb="promotion" data-elbaction="visible:view">
      <h1 data-elb-promotion="name:Setting up tracking easily">
        Setting up tracking easily
      </h1>
      <p data-elb-promotion="category:analytics">Analytics</p>
    </div>
  </div>
</body>
```

generates an event like

```js
{
  event: 'promotion view', // Combination of entity and action
  data: {
    // Arbitrary set properties with the data-elb-promotion attribute
    name: 'Setting up tracking easily',
    category: 'analytics',
  },
  context: {
    // Related properties defined with the data-elbcontext attribute
    test: ['engagement', 0] // Value and order
  },
  globals: {
    // General Properties defined with the data-elbglobals attribute
    language: 'en'
  },
  user: {
    // Stored user ids (manually added once)
    id: 'userid',
    device: 'cookieid',
    session: 'sessionid',
  },
  nested: [], // All nested entities within the promotion
  consent: { functional: true }, // Status of the consent state(s)
  id: '1647261462000-01b5e2-5', // Timestamp, group & count of the event
  trigger: 'visible', // Name of the trigger that fired
  entity: 'promotion', // Entity name
  action: 'view', // Entity action
  timestamp: 1647261462000, // Time when the event fired
  timing: 3.14, // How long it took from the page load to trigger the event
  group: '01b5e2', // Random group id for all events on a page
  count: 2, // Incremental counter of the events on a page
  version: {
    // Helpful when working with raw data
    walker: 1.6, // Used walker.js version
    config: 42, // A custom configuration version number
  },
  source: {
    // Origins of the event
    type: 'web', // Source type of the event
    id: 'https://github.com/elbwalker/walker.js', // Source id of the event's origin (url)
    previous_id: 'https://www.elbwalker.com/' // Previous source id (referrer)
  },
  walker: true, // Flag to filter events
}
```

that [destinations](https://docs.elbwalker.com/destinations/details) automatically translates into proper implementations.

## Contact

Send us an email if you have any questions or feedback at hello@elbwalker.com

Want to send the data directly to your Google BigQuery instance? Check out our hosted version at https://www.elbwalker.com/

<p align="right">(<a href="#top">back to top</a>)</p>
