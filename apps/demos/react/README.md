# walkerOS React Demo

A demo application showing how to use the new walkerOS packages with React.

## Overview

This demo has been updated to use the new walkerOS package structure:

- `@walkerOS/core` - Core types and utilities
- `@walkerOS/web-collector` - Browser-based event collection
- `@walkerOS/web-destination-gtm` - Google Tag Manager destination
- `@walkerOS/web-destination-ga4` - Google Analytics 4 destination
- `@walkerOS/web-destination-meta` - Meta Pixel destination
- `@walkerOS/web-source-dataLayer` - DataLayer source integration

## Features

- **Local Package Integration**: Uses local walkerOS packages from the monorepo
- **Multiple Destinations**: Demonstrates GTM, GA4, and Meta Pixel integrations
- **DataLayer Source**: Shows how to capture events from window.dataLayer
- **Console Logging**: All events are logged to the console for debugging
- **React Integration**: Page view tracking on route changes

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will start at http://127.0.0.1:8002 and you can see events being logged
to the console.

## Setup and Configuration

The new setup uses the `@walkerOS/web-collector` instead of the legacy
`@elbwalker/walker.js`:

```ts
import { elb, webCollector } from '@walkerOS/web-collector';
import { destinationGTM } from '@walkerOS/web-destination-gtm';
import { destinationGA4 } from '@walkerOS/web-destination-ga4';
import { destinationMeta } from '@walkerOS/web-destination-meta';
```

### Destination init

The new system supports user-friendly lean destinations that don't require the
`config` property:

```ts
webCollector({
  destinations: {
    log: {
      push: console.log,
    },
    elbEvents: {
      init: () => {
        window.elbEvents = [];
      },
      push: (event: unknown) => {
        window.elbEvents.push(event);
      },
    },
  },
});
```

The collector automatically adds `config: {}` to any destination that doesn't
have one.

Update the settings in `src/data/index.ts` to configure your tracking IDs:

```typescript
// Google Tag Manager
containerId: 'GTM-XXXXXXX', // Replace with your GTM container ID

// Google Analytics 4
measurementId: 'G-XXXXXXXXXX', // Replace with your GA4 measurement ID

// Meta Pixel
pixelId: '1234567890', // Replace with your Meta Pixel ID
```

Set `loadScript: true` to automatically load the respective tracking scripts.

## Trigger page views

Page views are triggered automatically on route changes using `useLocation` from
react-router-dom:

```ts
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { elb } from '@walkerOS/web-collector';

const location = useLocation();
useEffect(() => {
  elb('walker run');
}, [location]);
```

## Events

Here we have the entities `page`, `account`, `pricing` & `promotion`. While a
page can be _viewed_ and _read_ the app events are considered as core events on
this page and appear on multiple sites like the promotion that serves as a
fictional cta banner to encourage a new signup. The pricing actions are great
for targeted remarketing since a freelancer requires another messaging than an
enterprise visitor. The detailed requests are also a great source for product or
sales teams.

We use a light
[atomic design](https://bradfrost.com/blog/post/atomic-web-design/) approach to
demonstrate how to set up actions automatically using granular components.

The layout is based on components made by
[Tailwind UI](https://tailwindui.com/).
