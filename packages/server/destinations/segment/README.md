# @walkeros/server-destination-segment

Server-side Segment CDP destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards events to Segment
via the official `@segment/analytics-node` SDK with full Segment Spec support
(Track, Identify, Group, Page, Screen).

## Installation

```bash
npm install @walkeros/server-destination-segment
```

## Quick Start

```json
{
  "destinations": {
    "segment": {
      "package": "@walkeros/server-destination-segment",
      "config": {
        "settings": {
          "writeKey": "YOUR_SEGMENT_WRITE_KEY",
          "userId": "user.id",
          "anonymousId": "user.session"
        }
      }
    }
  }
}
```

## Settings

| Setting         | Type         | Required | Default                    | Description                                                    |
| --------------- | ------------ | -------- | -------------------------- | -------------------------------------------------------------- |
| `writeKey`      | string       | Yes      | --                         | Segment source write key                                       |
| `userId`        | string       | No       | `'user.id'`                | Mapping path to resolve userId from events                     |
| `anonymousId`   | string       | No       | `'user.session'`           | Mapping path to resolve anonymousId from events                |
| `identify`      | MappingValue | No       | --                         | Destination-level identity mapping                             |
| `group`         | MappingValue | No       | --                         | Destination-level group mapping                                |
| `host`          | string       | No       | `'https://api.segment.io'` | API endpoint (use `https://events.eu1.segmentapis.com` for EU) |
| `flushAt`       | number       | No       | `15`                       | Events to enqueue before flushing                              |
| `flushInterval` | number       | No       | `10000`                    | Max ms before auto-flush                                       |
| `maxRetries`    | number       | No       | `3`                        | Retry attempts for failed batches                              |
| `consent`       | Record       | No       | --                         | walkerOS consent key to Segment category mapping               |
| `integrations`  | Record       | No       | --                         | Downstream destination filtering                               |

## Mapping Settings

Per-event mapping settings control which Segment methods are called:

| Setting    | Effect                       | Use with `silent: true` |
| ---------- | ---------------------------- | ----------------------- |
| `identify` | Calls `analytics.identify()` | Yes, for login events   |
| `group`    | Calls `analytics.group()`    | Yes, for company events |
| `page`     | Calls `analytics.page()`     | Yes, for page views     |
| `screen`   | Calls `analytics.screen()`   | Yes, for mobile screens |

## Identity

Server-side Segment requires identity on every call. The destination resolves
`userId` and `anonymousId` from each event via the configured mapping paths and
attaches them to every SDK call.

## Shutdown

The destination implements `destroy()` calling `analytics.closeAndFlush()` to
ensure buffered events are sent before process exit.
