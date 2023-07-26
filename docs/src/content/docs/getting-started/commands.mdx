---
title: Commands
---

The walker is designed to support asynchronous communication through the elbLayer array. With the creation of the Elbwalker() the elbLayer items are scanned. The walker will process each push. Use the elb helper function as a handy helper.

```js
import { elb } from '@elbwalker/walker.js';

// Or define the elb function manually in the browser as an alternative
function elb(){(window.elbLayer = window.elbLayer || []).push(arguments);}
```

To configure elbwalker use the walker prefix (like an entity) to call a command.

## config

Setting the general configuration. Almost identical to the settings at the installation, except for default. 

```js
elb("walker config", {
  // consent: { functional: true }, // Initial consent states, learn more under consent
  // elbLayer: window.elbLayer, // Public elbwalker API for async communication (only prior run)
  // globals: {}, // Static attributes added to each event
  // pageview: true, // Trigger a page view event by default
  // prefix: "data-elb", // Attributes prefix used by the walker
  // user: { id: '', device: '', session: '' }, // Setting the user ids
  // version: 0 // Current version of the tracking setup
});
```

## consent

Handles the consent states for specific groups or tools. Those names can be defined arbitrarily, but common groups are functional, statistical, and marketing. Values are booleans and once a value is set to true it’s treated as consent being granted. Previously pushed events during the run are shared now with destinations as well as new ones.

```js
elb("walker consent" { marketing: true, randomTool: true });
```

## destination

Used to add a new destination. Individual destination configurations can be made by using the destination.config property.

```js
import destinationGTM from '@elbwalker/destination-web-google-gtm';
elb("walker destination", destinationGTM);

const destinationLog = { push: console.log }; // Demo destination for console.log
elb("walker destination", destinationLog);
```

## init

(Re-)initializes event listeners on one or multiple target elements. Can be used for e.g. asynchronously loaded content like newly added products in a category list or a wizard.

```js
elb("walker init", element); // or an array of elements
```

## run

Used to actually start the walker, like a regular page view. (Re-)Initializes the handler, resets counters, clears queues, and updates the globals

```js
elb("walker run");
```

## user

Setting the user ids. There are three levels for user identification. Typically the user is a company's internal id. In contrast, the device id can be treated as a value stored in a cookie for a longer time period and the session can be used for temporary identification.

```js
elb("walker user", { id: "userid", device: "cookieid", session: "sessionid" });
```

The new user ids are now added to each event. Make sure to only use hashed or anonymous ids.