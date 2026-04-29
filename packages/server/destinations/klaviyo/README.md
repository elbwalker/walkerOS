# @walkeros/server-destination-klaviyo

Server-side Klaviyo destination for
[walkerOS](https://github.com/elbwalker/walkerOS). Forwards events to Klaviyo
via the official `klaviyo-api` SDK with event tracking and profile management.

## Installation

```bash
npm install @walkeros/server-destination-klaviyo
```

## Quick Start

```json
{
  "destinations": {
    "klaviyo": {
      "package": "@walkeros/server-destination-klaviyo",
      "config": {
        "settings": {
          "apiKey": "$KLAVIYO_API_KEY",
          "email": "user.email",
          "externalId": "user.id"
        }
      }
    }
  }
}
```

## Settings

| Setting       | Type         | Required | Default        | Description                                              |
| ------------- | ------------ | -------- | -------------- | -------------------------------------------------------- |
| `apiKey`      | string       | Yes      | --             | Klaviyo private API key (starts with `pk_`)              |
| `email`       | string       | No       | `'user.email'` | Mapping path to resolve email from events                |
| `externalId`  | string       | No       | `'user.id'`    | Mapping path to resolve external ID from events          |
| `phoneNumber` | string       | No       | --             | Mapping path to resolve phone number (E.164) from events |
| `identify`    | MappingValue | No       | --             | Destination-level profile upsert mapping                 |
| `currency`    | string       | No       | --             | Default ISO 4217 currency code for revenue events        |

## Mapping Settings

Per-event mapping settings control additional behavior:

| Setting    | Effect                                     | Use with `silent: true`      |
| ---------- | ------------------------------------------ | ---------------------------- |
| `identify` | Calls `createOrUpdateProfile()`            | Yes, for login/signup events |
| `value`    | Sets revenue value + currency on the event | No                           |

## Identity

Klaviyo requires at least one profile identifier per event: `email`,
`phoneNumber`, or `externalId`. The destination resolves these from each
walkerOS event using the configured mapping paths. Events without any identifier
are skipped with a warning.

## Revenue Tracking

Map `settings.value` to a numeric event property. The destination sets the
Klaviyo `value` property and `valueCurrency` (from `settings.currency`).

## Ecommerce

Use `mapping.name` to map walkerOS event names to Klaviyo's expected metric
names:

| walkerOS Event   | Klaviyo Metric   | Unlocks                |
| ---------------- | ---------------- | ---------------------- |
| `product view`   | `Viewed Product` | Product analytics      |
| `product add`    | `Added to Cart`  | Cart abandonment flows |
| `order complete` | `Placed Order`   | Revenue reporting, CLV |
