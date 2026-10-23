# walkerOS React Demo

This demo integrates walkerOS into a React application built with TypeScript and
Vite.

## Features

- **Shop pages**: home, category, product detail, checkout and order
  confirmation, routed with React Router
- **Page views**: `walker run` on every route change sends the page view
- **Consent**: Accept, Deny and Reset in the control bar, with the choice kept
  in `localStorage`
- **Destinations**: console, console batch, API, GA4 and dataLayer
- **Batching**: `visible` events go to the console batch destination in batches
- **Tagging**: `data-elb` attributes built with the browser source's tagger
- **Highlighting**: the control bar highlights tagged elements by attribute
- **Programmatic Tracking**: events sent with `elb` from React components

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The app will be available at http://localhost:3001

## Configuration

The walkerOS setup is in `src/walker/index.ts`, one `startFlow` call:

- **Collector**: `run: false` (the app sends `walker run` per route) and
  `consent: { functional: true }`
- **Browser source**: `pageview: true`, `elb: 'elb'`
- **Destinations**:
  - Console: logs every event
  - Console Batch: receives the `visible` events of every entity in batches
    (`batch: 1000`, a wait of 1000 ms)
  - API: sends events to `https://httpbin.org/post`, with analytics consent
  - GA4: Google Analytics 4 with a placeholder measurement ID, with analytics
    and marketing consent
  - dataLayer: pushes events to `window.dataLayer`

A stored choice (`walker_consent` in `localStorage`) is applied again when the
app loads.

## Usage

### Consent Management

The control bar at the bottom allows users to:

- **Accept**: Enables all tracking (functional, analytics, marketing)
- **Deny**: Disables analytics and marketing, keeps functional
- **Reset**: Forgets the stored choice; the current consent stays until the page
  reloads

### Data Attribute Tracking

Components build their `data-elb` attributes with the tagger from
`src/walker/index.ts`:

```tsx
import { tagger } from '../walker';

<Link
  to={`/product/${product.id}`}
  {...tagger()
    .entity('product')
    .action('click')
    .data({ id: product.id, name: product.name, price: product.price })
    .context('position', index + 1)
    .get()}
>
```

This renders `data-elb="product"`, `data-elbaction="click:click"`,
`data-elb-product="id:...;name:...;price:..."` and
`data-elbcontext="position:1"`.

### Programmatic Tracking

Track events manually from React components:

```typescript
// Track custom event
window.elb({
  name: 'custom event',
  data: { category: 'interaction', action: 'button_click', label: 'cta' },
});

// Update consent
window.elb('walker consent', {
  functional: true,
  analytics: true,
  marketing: false,
});
```

## Development

- `npm run dev`: start the development server
- `npm run build`: build for production
- `npm run lint`: run ESLint
- `npm run typecheck`: check the TypeScript types
- `npm test`: run the tests

## Architecture

```
src/
├── walker/
│   ├── index.ts        # startFlow, stored consent, tagger
│   └── destinations/   # Console, console batch and dataLayer destinations
├── components/         # Navigation, ControlBar, product and checkout parts
├── pages/              # Home, Category, Detail, Checkout, OrderConfirmation
├── data/products.ts    # Product data
└── App.tsx             # Routes, walker run on every route change
```
