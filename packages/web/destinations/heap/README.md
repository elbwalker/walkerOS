<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Heap Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/heap)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-heap)
&bull; [Documentation](https://www.walkeros.io/docs/destinations/web/heap)

This package forwards walkerOS events to [Heap](https://www.heap.io/) — product
analytics with auto-capture, heatmaps, and session replay. Loads the official
Heap snippet from Heap's CDN and forwards events through `window.heap.track()`.

walkerOS follows a **source → collector → destination** architecture. This Heap
destination receives processed events from the walkerOS collector and forwards
them as `heap.track()` calls plus identity and persistent property updates.

## Features

- **Default event forwarding** — every walkerOS event becomes
  `heap.track(name, properties)`
- **Identity** — `heap.identify(id)` and `heap.resetIdentity()` for login/logout
- **User properties** — `heap.addUserProperties({...})` at destination or rule
  level
- **Persistent event properties** — `heap.addEventProperties({...})` and
  `heap.clearEventProperties()` via rule settings
- **Consent** — `heap.startTracking()` / `heap.stopTracking()` wired to walkerOS
  `config.consent`
- **Snippet injection** — loads `heap-<appId>.js` from Heap's CDN with
  `disablePageviewAutocapture: true` and `disableTextCapture: true` defaults so
  walkerOS sources own event capture

## Installation

```sh
npm install @walkeros/web-destination-heap
```

## Quick Start

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationHeap } from '@walkeros/web-destination-heap';

await startFlow({
  destinations: {
    heap: {
      code: destinationHeap,
      config: {
        loadScript: true,
        settings: {
          appId: 'YOUR_HEAP_APP_ID',
        },
      },
    },
  },
});
```

## Configuration

### Settings (destination-level)

| Name                         | Type            | Description                                                                                      | Required |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------ | -------- |
| `appId`                      | `string`        | Heap App ID (Project > Settings > App ID)                                                        | Yes      |
| `disableTextCapture`         | `boolean`       | Disable Heap auto text capture. Defaults to `true`.                                              | No       |
| `disablePageviewAutocapture` | `boolean`       | Disable Heap automatic pageview tracking. Defaults to `true` (walkerOS sources emit pageviews).  | No       |
| `disableSessionReplay`       | `boolean`       | Disable Heap session replay.                                                                     | No       |
| `secureCookie`               | `boolean`       | SSL-only cookies.                                                                                | No       |
| `ingestServer`               | `string`        | Custom server endpoint (first-party proxy).                                                      | No       |
| `identify`                   | `Mapping.Value` | Destination-level identity mapping — resolves to a string for `heap.identify()`                  | No       |
| `userProperties`             | `Mapping.Value` | Destination-level user properties mapping — resolves to an object for `heap.addUserProperties()` | No       |
| `heapConfig`                 | `HeapConfig`    | Passthrough for additional `heap.load()` options                                                 | No       |

### Mapping (`rule.settings`)

| Name                   | Type                       | Description                                                                      |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `identify`             | `Mapping.Value`            | Per-event identity — resolves to a string for `heap.identify()`                  |
| `reset`                | `boolean \| Mapping.Value` | Truthy triggers `heap.resetIdentity()` (e.g. on logout)                          |
| `userProperties`       | `Mapping.Value`            | Per-event user properties — resolves to object for `heap.addUserProperties()`    |
| `eventProperties`      | `Mapping.Value`            | Persistent event properties — resolves to object for `heap.addEventProperties()` |
| `clearEventProperties` | `boolean \| Mapping.Value` | Truthy triggers `heap.clearEventProperties()`                                    |

Standard mapping features also apply:

- `name` — rename the forwarded event (`heap.track(<new name>, ...)`)
- `skip` — suppress the default `heap.track(...)` call while still running
  `identify` / `userProperties` / `reset` / `eventProperties`
- `ignore` — drop the event entirely
- `data` — resolve event properties forwarded as the second argument to
  `heap.track(...)`

## Identity

Heap identity is sticky — call `heap.identify(id)` on login and
`heap.resetIdentity()` on logout. A typical mapping:

```typescript
mapping: {
  user: {
    login: {
      skip: true,
      settings: {
        identify: 'data.email',
        userProperties: {
          map: { plan: 'data.plan', company: 'data.company' },
        },
      },
    },
    logout: {
      skip: true,
      settings: { reset: true },
    },
  },
}
```

## Consent

The destination wires walkerOS `config.consent` to Heap's runtime consent API.
When all required consent keys are `true`, `heap.startTracking()` is called;
otherwise `heap.stopTracking()`.

```typescript
destinations: {
  heap: {
    code: destinationHeap,
    config: {
      consent: { analytics: true },
      settings: { appId: 'YOUR_HEAP_APP_ID' },
    },
  },
}
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
