# @walkeros/server-destination-customerio

Server-side Customer.io destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards events to
Customer.io via the official `customerio-node` SDK with support for Track,
Identify, Page View, Transactional Messaging, and Customer Lifecycle management.

## Installation

```bash
npm install @walkeros/server-destination-customerio
```

## Quick Start

```json
{
  "destinations": {
    "customerio": {
      "package": "@walkeros/server-destination-customerio",
      "config": {
        "settings": {
          "siteId": "YOUR_SITE_ID",
          "apiKey": "YOUR_API_KEY",
          "customerId": "user.id",
          "anonymousId": "user.session"
        }
      }
    }
  }
}
```

## Settings

| Setting       | Type             | Required | Default          | Description                                                  |
| ------------- | ---------------- | -------- | ---------------- | ------------------------------------------------------------ |
| `siteId`      | string           | Yes      | --               | Customer.io Site ID                                          |
| `apiKey`      | string           | Yes      | --               | Customer.io API Key                                          |
| `appApiKey`   | string           | No       | --               | App API Key for transactional messaging (sendEmail/sendPush) |
| `region`      | `'us'` \| `'eu'` | No       | `'us'`           | Data center region                                           |
| `timeout`     | number           | No       | `10000`          | HTTP request timeout in ms                                   |
| `customerId`  | string           | No       | `'user.id'`      | Mapping path to resolve customerId from events               |
| `anonymousId` | string           | No       | `'user.session'` | Mapping path to resolve anonymousId from events              |
| `identify`    | MappingValue     | No       | --               | Destination-level identity mapping                           |

## Mapping Settings

Per-event mapping settings control which Customer.io methods are called:

| Setting        | Effect                                         | Use with `silent: true` |
| -------------- | ---------------------------------------------- | ----------------------- |
| `identify`     | Calls `identify()` with attributes             | Yes, for login events   |
| `page`         | Calls `trackPageView()` with url               | Yes, for page views     |
| `destroy`      | Permanently deletes person                     | Yes                     |
| `suppress`     | Stops messaging (keeps data)                   | Yes                     |
| `unsuppress`   | Resumes messaging                              | Yes                     |
| `addDevice`    | Registers push device                          | Yes                     |
| `deleteDevice` | Removes push device                            | Yes                     |
| `merge`        | Merges duplicate profiles                      | Yes                     |
| `sendEmail`    | Sends transactional email (requires appApiKey) | Yes                     |
| `sendPush`     | Sends transactional push (requires appApiKey)  | Yes                     |

## Identity

Customer.io uses `customerId` as the primary identifier. When `customerId`
cannot be resolved but `anonymousId` is available, the destination automatically
falls back to `trackAnonymous()` for data preservation.

## Shutdown

The destination implements `destroy()` by clearing SDK client references. No
flush is needed since `customerio-node` does not batch internally.
