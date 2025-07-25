<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Browser DOM Source for walkerOS

The walkerOS Browser DOM Source provides automatic event collection from browser
interactions and DOM elements, plus a tagger utility for generating HTML data
attributes. It serves as the primary source for capturing user behavior, page
views, and element interactions directly from the DOM without requiring manual
event instrumentation.

## Role in walkerOS Ecosystem

walkerOS follows a **source → collector → destination** architecture:

- **Sources**: Capture events from various environments (browser DOM, dataLayer,
  server requests)
- **Collector**: Processes, validates, and routes events with consent awareness
- **Destinations**: Send processed events to analytics platforms (GA4, Meta,
  custom APIs)

The Browser DOM Source automatically detects and captures user interactions,
page lifecycle events, and element visibility changes, transforming them into
standardized walkerOS events that flow through the collector to your configured
destinations.

## Installation

```sh
npm install @walkerOS/web-source-browser
```

## Usage

Here's a basic example of how to use the Browser DOM source:

```typescript
import { elb } from '@walkerOS/collector';
import { sourceBrowser, createTagger } from '@walkerOS/web-source-browser';

// Initialize the browser source
sourceBrowser({ elb });

// Use the tagger to generate HTML data attributes
const tagger = createTagger();
const attrs = tagger('product').data('id', '123').action('load', 'view').get();
// Result: { 'data-elb': 'product', 'data-elb-product': 'id:123', 'data-elbaction': 'load:view' }

// The source will now automatically capture:
// - Page views
// - Click events
// - Form submissions
// - Element visibility changes
// - Custom data attributes
```

## Automatic Event Capture

The browser source automatically captures:

- **Page Events**: Page views, navigation, and lifecycle events
- **Click Events**: Button clicks, link clicks, and element interactions
- **Form Events**: Form submissions and field interactions
- **Visibility Events**: When elements become visible in the viewport
- **Custom Events**: Events defined through data attributes in HTML

## Data Attributes

Use HTML data attributes to define custom tracking:

```html
<!-- Automatic click tracking -->
<button data-elb="promotion" data-elb-promotion="click">Shop Now</button>

<!-- Custom event data -->
<div data-elb="product" data-elb-product="view" data-name="Premium Plan">
  Product content
</div>
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
