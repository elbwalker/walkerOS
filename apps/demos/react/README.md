# walkerOS React Demo

This demo showcases how to integrate walkerOS into a React application using
TypeScript and Vite.

## Features

- **Page Navigation Tracking**: Automatic page view tracking with React Router
- **Global Context**: Different page contexts (page:A, page:B) for segmentation
- **Consent Management**: Interactive consent bar with localStorage persistence
- **Multiple Destinations**: Console logging, batch events, API, GA4, and
  dataLayer
- **Event Mapping**: Demonstrates how to transform events for different
  destinations
- **Data Attributes**: Declarative tracking using data-elb attributes
- **Programmatic Tracking**: Manual event triggering from React components

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

The walkerOS configuration is located in `src/walker/config.json`. It includes:

- **Collector settings**: Consent defaults, session configuration
- **Browser source**: Data attribute prefix, page view tracking, visible
  tracking
- **Destinations**:
  - Console: Logs all events with timestamps
  - Console Batch: Bundles visible events for batch processing
  - API: Sends events to configured endpoint (default: httpbin.org)
  - GA4: Google Analytics 4 with event mapping
  - dataLayer: Pushes events to window.dataLayer

## Usage

### Consent Management

The consent bar at the bottom allows users to:

- **Accept**: Enables all tracking (functional, analytics, marketing)
- **Deny**: Disables analytics and marketing, keeps functional
- **Reset**: Clears consent choice

### Data Attribute Tracking

Add tracking to any element using data attributes:

```html
<!-- Track entity with action -->
<div data-elb="product" data-elbaction="click">
  <h3 data-elb-product="name:#innerText">Product Name</h3>
  <p data-elb-product="price:#innerText">$99.99</p>
</div>

<!-- Set global properties -->
<a data-elbglobals="page:A" href="/page-a">Page A</a>
```

### Programmatic Tracking

Track events manually from React components:

```typescript
// Track custom event
window.elb('custom event', {
  category: 'interaction',
  action: 'button_click',
  label: 'cta',
});

// Update consent
window.elb('walker consent', {
  functional: true,
  analytics: true,
  marketing: false,
});
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Architecture

```
src/
├── walker/              # walkerOS configuration and initialization
│   ├── config.json     # Main configuration file
│   └── index.ts        # Initialization logic
├── components/         # React components
│   ├── Navigation.tsx  # Top navigation with page globals
│   └── ConsentBar.tsx  # Consent management UI
├── pages/              # Page components
│   ├── PageA.tsx       # Demo page A
│   └── PageB.tsx       # Demo page B
└── App.tsx            # Main app component with routing
```
