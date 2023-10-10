# walkerOS react example

Here is an example of a possible walkerOS setup with React.
It's a SaaS landing page where we want to know more about the general usage of the pages as well as the signup and pricing discovery behavior.

## Setup and helper function

Using the walkerOS web client with a SPA requires call the `walker run` event on each router update (see src/app.tsx).
We also use a short helper function to push events to the web client. In this example we're using `console.log` and `dataLayer` as our destinations (see src/data.ts). In order to activate the Googlt GTM destination, functional consent is required (run `elb('walker consent', { functional: true });` in the console).

## Trigger page views

We need to set up the typical page view behavior. Therefore we're pushing the `walker run` event each time the location changes.

The `walker run` command reinitializes the state but keeps all walker configurations. It's just like a new page view.

This example uses version 6 of react-router-dom with useLocation.
Update your Routes file with a `useEffect` on the `useLocation` (./src/app.js here).

```ts
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { elb } from '@elbwalker/client-web';

const location = useLocation();
useEffect(() => {
  elb('walker run');
}, [location]);
```

> Note when using `React.StrictMode` the initial walker run is called twice due to mounting, unmounting & remounting again. But only in dev mode.

## Events

Here we have the entities `page`, `account`, `pricing` & `promotion`.
While a page can be _viewed_ and _read_ the app events are considered as core events on this page and appear on multiple sites like the promotion that serves as a fictional cta banner to encourage a new signup. The pricing actions are great for targeted remarketing since a freelancer requires another messaging than an enterprise visitor. The detailed requests are also a great source for product or sales teams.

We use a light [atomic design](https://bradfrost.com/blog/post/atomic-web-design/) approach to demonstrate how to set up actions automatically using granular components.

The layout is based on components made by [Tailwind UI](https://tailwindui.com/).
