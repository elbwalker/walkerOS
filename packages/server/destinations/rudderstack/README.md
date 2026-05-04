# @walkeros/server-destination-rudderstack

Server-side RudderStack CDP destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards events to
RudderStack via the official `@rudderstack/rudder-sdk-node` SDK with full
Segment Spec support (Track, Identify, Group, Page, Screen, Alias).

## Installation

```bash
npm install @walkeros/server-destination-rudderstack
```

## Quick Start

```json
{
  "destinations": {
    "rudderstack": {
      "package": "@walkeros/server-destination-rudderstack",
      "config": {
        "settings": {
          "writeKey": "YOUR_RUDDERSTACK_WRITE_KEY",
          "dataPlaneUrl": "https://your-data-plane.rudderstack.com",
          "userId": "user.id",
          "anonymousId": "user.session"
        }
      }
    }
  }
}
```

## Settings

| Setting         | Type         | Required | Default          | Description                                     |
| --------------- | ------------ | -------- | ---------------- | ----------------------------------------------- |
| `writeKey`      | string       | Yes      | --               | RudderStack source write key                    |
| `dataPlaneUrl`  | string       | Yes      | --               | RudderStack data plane URL                      |
| `userId`        | string       | No       | `'user.id'`      | Mapping path to resolve userId from events      |
| `anonymousId`   | string       | No       | `'user.session'` | Mapping path to resolve anonymousId from events |
| `identify`      | MappingValue | No       | --               | Destination-level identity mapping              |
| `group`         | MappingValue | No       | --               | Destination-level group mapping                 |
| `flushAt`       | number       | No       | `20`             | Events to enqueue before flushing               |
| `flushInterval` | number       | No       | `10000`          | Max ms before auto-flush                        |
| `retryCount`    | number       | No       | `3`              | Retry attempts for failed batches               |
| `gzip`          | boolean      | No       | `true`           | Enable gzip compression                         |
| `integrations`  | Record       | No       | --               | Downstream destination filtering                |

## Mapping Settings

Per-event mapping settings control which RudderStack methods are called:

| Setting    | Effect                       | Use with `silent: true`  |
| ---------- | ---------------------------- | ------------------------ |
| `identify` | Calls `analytics.identify()` | Yes, for login events    |
| `group`    | Calls `analytics.group()`    | Yes, for company events  |
| `page`     | Calls `analytics.page()`     | Yes, for page views      |
| `screen`   | Calls `analytics.screen()`   | Yes, for mobile screens  |
| `alias`    | Calls `analytics.alias()`    | Yes, for identity merges |

## Identity

Server-side RudderStack requires identity on every call. The destination
resolves `userId` and `anonymousId` from each event via the configured mapping
paths and attaches them to every SDK call.

## Alias

RudderStack supports `alias()` for linking anonymous and identified user
profiles. Configure via `mapping.settings.alias` with a `previousId` field.

## Shutdown

The destination implements `destroy()` calling `analytics.flush()` to ensure
buffered events are sent before process exit.
