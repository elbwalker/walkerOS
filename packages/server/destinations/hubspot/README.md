# @walkeros/server-destination-hubspot

Server-side HubSpot CRM destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Sends custom events and
upserts contacts via the official `@hubspot/api-client` SDK.

## Installation

```bash
npm install @walkeros/server-destination-hubspot
```

## Quick Start

```json
{
  "destinations": {
    "hubspot": {
      "package": "@walkeros/server-destination-hubspot",
      "config": {
        "consent": { "marketing": true },
        "settings": {
          "accessToken": "$env:HUBSPOT_ACCESS_TOKEN",
          "eventNamePrefix": "pe12345678_",
          "email": "user.email",
          "defaultProperties": {
            "hs_touchpoint_source": "walkerOS"
          }
        }
      }
    }
  }
}
```

## Settings

| Setting             | Type         | Required | Default        | Description                              |
| ------------------- | ------------ | -------- | -------------- | ---------------------------------------- |
| `accessToken`       | string       | Yes      | --             | HubSpot private app access token         |
| `eventNamePrefix`   | string       | Yes      | --             | Fully qualified prefix: `pe{HubID}_`     |
| `email`             | string       | No       | `'user.email'` | Mapping path to resolve contact email    |
| `objectId`          | string       | No       | --             | Mapping path to resolve CRM objectId     |
| `identify`          | MappingValue | No       | --             | Destination-level contact upsert mapping |
| `defaultProperties` | Record       | No       | --             | Static properties added to every event   |
| `batch`             | boolean      | No       | `false`        | Use batch API for events                 |
| `batchSize`         | number       | No       | `50`           | Events before auto-flush (max 500)       |

## Mapping Settings

Per-event mapping settings control behavior per rule:

| Setting      | Effect                                                       | Use with `skip: true` |
| ------------ | ------------------------------------------------------------ | --------------------- |
| `eventName`  | Overrides auto-generated event name (prefix still prepended) | No                    |
| `identify`   | Upserts contact via CRM API                                  | Yes, for login events |
| `properties` | Maps event data to HubSpot event properties                  | No                    |

## Identity

HubSpot requires every event to be associated with a contact via `email` or
`objectId`. Events where neither resolves are skipped with a warning.

## Contact Upsert

The `identify` setting (destination-level or per-rule) resolves to
`{ email, properties }` and calls `crm.contacts.basicApi.update()` with
`idProperty: 'email'`. State-based dedup prevents redundant API calls when
identity has not changed.

## Batch Mode

Set `batch: true` to accumulate events and flush via
`events.send.batchApi.send()` when the queue reaches `batchSize`. Remaining
events are flushed on `destroy()`.

## Prerequisites

- HubSpot Marketing Hub Professional+ (required for custom events)
- Private app with `analytics.behavioral_events.send` scope
- Custom events must be pre-defined in HubSpot before sending occurrences
