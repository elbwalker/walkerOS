---
title: Basics
---

##### How elbwalker destinations work and why you should use them

Walker.js is meant to be <b>vendor-agnostic</b>. We actually encourage you to use different tools for different purposes. But we also encourage you to minimize the instrumentation effort and use walker.js as a <b>universal implementation layer</b>.

Destination will help you with:

- Keep your data clean by enforcing event <b>naming conventions</b>
- Easily <b>set up new</b> analytics tools

A destination receives events through the `push` interface. Configurations can be made in the `config` object. The optional `init` function gets called before actually pushing events and has to return true on proper initialization to do so.

```js
import { elb } from '@elbwalker/walker.js';

type Config = WebDestination.Config<CustomConfig, CustomEventConfig>;

interface CustomConfig {
  // Used for general destination settings
}

interface CustomEventConfig {
  // Used for individual event settings
}

const destination: WebDestination.Function<CustomConfig, CustomEventConfig> = {
  init: (config: Config) => {
    // Setting up the destination

    return true; // Returning true is required to process events
  },

  push: (
    event: IElbwalker.Event,
    config: Config,
    mapping?: WebDestination.EventConfig<CustomEventConfig>,
  ) => void {
    // Process the event
  },

  config: {
    // consent: { marketing: true, randomTool: true }, // Necessary consent states
    // custom: {
    //   // A destinations individual configuration settings (CustomConfig)
    // },
    // init: false, // Status of initialization, set to true to skip init
    // loadScript: false; // If an additional script to work should be loaded
    // mapping: {
    //   entity: {
    //     action: {
    //       consent: {}, // Required consent states to init and push events
    //       custom: {
    //         // CustomEventConfig
    //       },
    //       ignore: false, // Choose to no process an event when set to true
    //       name: "entity_action" // Use a custom event name
    //     },
    //   },
    // }, // Specific Event handling config
  },
};

elb('walker destination', destination, config);
```

## Overview

If you can't find your desired destination, you can [request it](https://github.com/elbwalker/walker.js/issues/new?assignees=&labels=&template=feature_request.md&title=) or [build your own](https://docs.elbwalker.com/destinations/custom).

| Google Analytics 4    | Google Tag Manager | Plausible Analytics |
|-----------------------|--------------------|---------------------|
| Event Pipe (BigQuery) |                    |                     |

<b>Hier noch die richtigen Kacheln einsetzen statt der Tabelle!!!</b>

## Usage

### Configuration

Each destination requires its own configuration. While there are common settings like `consent`, `init`, or `loadScript` there are also individual settings only available for a specific destination in the `custom` object and `mapping`.

A destination has a `Config` for general settings and `EventConfig` in the mapping used for event specifications.

```js
import { elb } from '@elbwalker/walker.js';
import destinationAPI, { DestinationAPI } from '@elbwalker/destination-web-google-ga4';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';

const configAPI: DestinationAPI.Config = {
  custom: { url: 'https://httpbin.org/anything', },
};
elb('walker destination', destinationAPI, configAPI);

destinationGoogleGA4.config = { custom: { measurementId: 'G-XXXXXX-1' } };
elb('walker destination', destinationGoogleGA4);
```

:::note[Info]
All settings, definitions, and examples are available in each [destination's details docs](https://docs.elbwalker.com/destinations/details).