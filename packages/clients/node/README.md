<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="256px"/>
  </a>
</p>

# walkerOS node client

## Introduction

The walkerOS node client provides a robust way to manage event tracking and data
collection in a Node.js environment. It offers a unified interface for handling
events and commands, managing destinations, and ensuring consent compliance.
This document aims to guide you through its features and functionalities.

## Installation

To install the walkerOS node client, run the following command:

```sh
$ npm install @elbwalker/client-node
```

## Configuration

Before you can start using the node client, you need to configure it. The
createNodeClient function is the entry point for creating a new instance. It
accepts an optional customConfig object to set initial configurations.

```ts
import { createNodeClient } from '@elbwalker/client-node';
const { elb, instance } = createNodeClient(customConfig);
```

Configuration Options

- `consent`: An object representing the consent states.
- `custom`: Custom state support for individual setups.
- `destinations`: An object containing all destinations.
- `globals`: Global properties that are added to each event by default.

## Core Functions

### setup

@TODO The setup function is currently under development and will be available in
future releases.

### init

Before pushing events to a destination, the client checks for an init function
in the destination. If available, it's called asynchronously. The function
should return false on error, which will prevent any events from being
processed. Alternatively, it can return a complete destination config that will
be used for pushing events.

### push

The push function is the core of the node client. It can either process commands
or handle events. Commands are processed when the function is called with a
string starting with "walker", like `elb("walker config", configData);`. Events
are processed otherwise.

The function performs consent checks before pushing events to destinations.
Events are pushed in parallel and support batching.

```ts
const result = await elb('entity action', eventData);
```

## Event Lifecycle

1. **Run Initialization**: A run is similar to a page view in a web environment.
   Each run (re-)initializes the client's state.
2. **Event Creation**: Events are created and added to the internal queue.
3. **Consent Check**: Before pushing, the client checks for required consent
   states.
4. **Destination Push**: Events are pushed to destinations based on the consent
   and configuration.

## Adding Destinations

Destinations can be added on creation using the `client.destinations` object, or
you can add destinations dynamically using the
`elb("walker destination", destination, config);` command. This is useful for
handling events that were pushed before the destination was added or if consent
was granted afterward.

> Note: The client stores events for each run. If a destination is added later
> or if consent changes, these "previous events" are also processed.

# walkerOS node destinations

In walkerOS, the configuration of a destination is a crucial part of setting up
your data pipeline. The configuration is divided into two main parts: the static
part and the custom part.

Learn more about [node destinations](../../destinations/node/).
