<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="256px"/>
  </a>
</p>

# @elbwalker/client-web (formerly walker.js)

<div align="left">
  <img src="https://img.shields.io/github/license/elbwalker/walkerOS" />
  <img src="https://img.shields.io/github/languages/top/elbwalker/walkerOS" />
  <a href="https://docs.elbwalker.com/"><img src="https://img.shields.io/badge/docs-docs.elbwalker.com-yellow" alt="elbwalker Documentation"></a>
</div>

Why you need it: Unify your data collection efforts across different departments with the web client, formerly known as walkerOS. This package offers a vendor-agnostic approach to front-end user event tracking, enabling you to collect high-quality, consent-aware data for analytics, marketing, and more.

## Usage

You can implement all sorts of front-end user events. From product and UX events like "promotion view", or filter usage, etc. to e-commerce actions like product add to carts or order complete events. The walkerOS handles all [trigger initializations](https://docs.elbwalker.com/tagging/available-triggers) and race conditions, builds the [events with context](https://docs.elbwalker.com/tagging/basics), and distributes them based on [consent states](https://docs.elbwalker.com/privacy/consent) and [mapping definitions](https://docs.elbwalker.com/destinations/basics#mapping) to any [destinations](https://docs.elbwalker.com/destinations/details).

To get started take a look at our detailed [documentation](https://docs.elbwalker.com/).

1. [Installation](https://docs.elbwalker.com/getting-started/installation)
2. [Tagging](https://docs.elbwalker.com/tagging/basics)
3. [Destinations](https://docs.elbwalker.com/destinations/basics)
4. [Consent](https://docs.elbwalker.com/privacy/consent)

## Basic Example

Here's a simple HTML example to demonstrate how tagging works:

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

This generates an event like:

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
  custom: {}, // Additional custom data for individual setups
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
    client: '1.0.0', // Semantic version of the used client
    tagging: 42, // A version number of the then used tagging status
  },
  source: {
    // Origins of the event
    type: 'web', // Source type of the event
    id: 'https://github.com/elbwalker/walkerOS', // Source id of the event's origin (url)
    previous_id: 'https://www.elbwalker.com/' // Previous source id (referrer)
  },
  walker: true, // Flag to filter events
}
```

## Who This Package is For

This package is intended for companies, agencies, freelancers, and in-house teams who aim to work in a data-driven manner. It serves the needs of data engineers, product owners, analysts, marketers, and developers all at the same time.

## Installation

TBD

## Tagging

TBD

## Destinations

TBD

## Consent

TBD
