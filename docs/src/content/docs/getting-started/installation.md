---
title: Installation
---

How to install walker.js.

## Configuration

By creating an Elbwalker instance you can specify its behaviour. All values are optional and only necessary for a custom configuration. The default settings are:

```js
{
  "consent": { "functional": true }, // Initial consent states, learn more under consent
  "default": true, // Use the default configuration with dataLayer destination and auto run
  "elbLayer": window.elbLayer, // Public elbwalker API for async communication
  "globals": {}, // Static attributes added to each event
  "pageview": true, // Trigger a page view event by default
  "prefix": "data-elb", // Attributes prefix used by the walker
  "user": { id: '', device: '', session: '' }, // Setting the user ids
  "version": 0 // Current version of the tracking setup
}
```

## NPM

To integrate walker.js with your website, you can use this [NPM module](https://www.npmjs.com/package/@elbwalker/walker.js) to package the walker directly into your project. To get started with the installation, run:

```js
npm i --save @elbwalker/walker.js
```

:::caution[Caution]
This NPM module is only meant to be used for a browser installation.
:::
As a next step run the following code snippet once:

```js
import Elbwalker from '@elbwalker/walker.js';
window.elbwalker = Elbwalker({
  // custom config
});
```

To configure and communicate with the walker you can use the elb-helper function:

```js
import { elb } from '@elbwalker/walker.js';
elb("entity action", data, trigger, context, nested); // push events
elb("walker <command>", data); // configure walker, see Commands
```

When using a Single Page Application like React, tell the walker to run on each location change in your app, like a real pageview:

```js
import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Elbwalker, { elb } from '@elbwalker/walker.js';

window.elbwalker = Elbwalker({ default: true });

export default function App() {
  const location = useLocation();
  React.useEffect(() => {
    elb('walker run'); // party hard!
  }, [location]);

  return (
      <Routes>
        // ...
      </Routes>
  );
}
```

Refer to the following folders on GitHub for a detailed example

- [Sample React project](https://github.com/elbwalker/walker.js/tree/main/examples/react)

## CDN

To quickly try it out, you can also grab the latest default walker.js configuration via CDN. Add the script tag to the < head > of your HTML file. 

```js
<script async class="elbwalker" src="https://cdn.jsdelivr.net/npm/@elbwalker/walker.js@latest/dist/walker.js" data-default="true"></script>
```

:::note[Info]
It's recommended to use the externally hosted version only for demo purposes and not in production. Also, be aware of the latest version, better use a specific version like 1.6
:::

In most of the examples, you'll find the imported elb function. The hosted browser version also comes with it but should be loaded async. Add the following snippet manually in addition to the script:

```js
<script>
  function elb(){(window.elbLayer = window.elbLayer || []).push(arguments);}
</script>
```


