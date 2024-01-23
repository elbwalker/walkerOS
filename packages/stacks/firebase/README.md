<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# walkerOS Firebase Stack

## Overview

The Firebase Stack is a specialized stack designed to work seamlessly with
Firebase's suite of backend services. It provides a robust yet simple, scalable,
and secure way to manage your event data within the Firebase ecosystem by using
a single funcion.

## Why Choose the Firebase Stack?

### Seamless Integration

The Firebase Stack offers a simple yet fully scalable solution for reliably
ingesting and processing your event data. With full control over your data
pipeline and high availability, it's not only robust but also easy to use and
maintain.

## Features

- **Event Reception**: Receives incoming events from walkerOS
  [clients](../../clients/).
- **Data Validation**: Ensures incoming data meets your predefined schemas.
- **Event Processing**: Enriches and transforms data before sending it to its
  final destination.

## How to Implement

There is a [demo implementation](../../../apps/demos/stacks/firebase/)
available.

1. **Initial Setup**:

```sh
$ npm install @elbwalker/stack-firebase
```

```ts
import { firebaseStack } from '@elbwalker/stack-firebase';

const { elb, push } = firebaseStack({
  // customConfig
});
```

2. **Configuration**:

The config is optional and supports the following settings:

```ts
// See type FirebaseStack.PartialConfig
const customConfig = {
  client: {}, // See NodeClient.PartialConfig from node-client
  firebase: {}, // See AppOptions from firebase-admin
};
```

The `client` object configures the in-built node-client where you can define a
name, destination settings, globals, contracs, etc.

The `firebase` object are the original `AppOptions` from the official firebase
SDK. Specify credentials, a projectId, or other setting.

3. **Development**:

Run `firebase emulators:start` to setup a local version of the stack and test
its behavior.

4. **Deployment**:

```sh
$ firebase deploy --only functions:FUNCTION_NAME --project Y0UR_PR0J3CT1D
```

Start sending events to the endpoint.

## Requirements

- Firebase project
- walkerOS [client](../../clients/) with an
  [API destination](../../destinations/)
