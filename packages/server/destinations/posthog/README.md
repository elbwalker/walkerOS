<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# PostHog Server Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/posthog)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-posthog)

walkerOS follows a **source -> collector -> destination** architecture. This
PostHog destination receives processed events from the walkerOS collector and
sends them server-to-server to PostHog using the `posthog-node` SDK, supporting
capture, identify, groupIdentify, groups on capture, consent, and graceful
shutdown.

## Installation

```sh
npm install @walkeros/server-destination-posthog
```

## Usage

### Minimal flow.json

```json
{
  "destinations": {
    "posthog": {
      "package": "@walkeros/server-destination-posthog",
      "config": {
        "settings": {
          "apiKey": "phc_..."
        }
      }
    }
  }
}
```

### Programmatic

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationPostHog } from '@walkeros/server-destination-posthog';

await startFlow({
  destinations: {
    posthog: {
      code: destinationPostHog,
      config: {
        settings: {
          apiKey: 'phc_...',
          host: 'https://eu.i.posthog.com',
        },
      },
    },
  },
});
```

## Settings

| Name                          | Type       | Description                                        | Required |
| ----------------------------- | ---------- | -------------------------------------------------- | -------- |
| `apiKey`                      | `string`   | PostHog project API key (`phc_...`)                | Yes      |
| `host`                        | `string`   | API endpoint (default: `https://us.i.posthog.com`) | No       |
| `flushAt`                     | `number`   | Events queued before auto-flush (default: 20)      | No       |
| `flushInterval`               | `number`   | ms between periodic flushes (default: 10000)       | No       |
| `personalApiKey`              | `string`   | Personal API key for local flag evaluation         | No       |
| `featureFlagsPollingInterval` | `number`   | ms between flag definition polls (default: 30000)  | No       |
| `disableGeoip`                | `boolean`  | Disable GeoIP lookups (GDPR)                       | No       |
| `debug`                       | `boolean`  | Enable SDK debug logging                           | No       |
| `identify`                    | `Mapping`  | Destination-level identity mapping                 | No       |
| `group`                       | `Mapping`  | Destination-level group mapping                    | No       |
| `include`                     | `string[]` | Event sections flattened into properties           | No       |

## Mapping Settings

Per-event mapping settings override destination-level settings.

| Name       | Type      | Description                                                      |
| ---------- | --------- | ---------------------------------------------------------------- |
| `identify` | `Mapping` | Resolves to `{ distinctId, $set?, $set_once? }` for `identify()` |
| `group`    | `Mapping` | Resolves to `{ type, key, properties? }` for `groupIdentify()`   |

## Identity

Every PostHog server call requires a `distinctId`. Resolution order:

1. Mapping-level `settings.identify.map.distinctId`
2. Destination-level `settings.identify.map.distinctId`
3. Fallback: `event.user.id`, `event.user.hash`, `event.user.session`, or
   `'anonymous'`

When `$set` or `$set_once` are present in the resolved identify object,
`client.identify()` is called with the person properties nested under
`properties: { $set, $set_once }`.

## Groups

Group analytics associates events with companies, teams, or projects.

- **With properties**:
  `client.groupIdentify({ groupType, groupKey, properties })`
- **Without properties**: adds `groups: { [type]: key }` to `capture()` calls

## Destroy / Shutdown

The destination implements `destroy()` calling `client.shutdown()` to flush all
queued events before the server flow exits. This is critical for ensuring no
events are lost on process shutdown.

## Self-Hosted PostHog

Set `host` to your self-hosted PostHog instance URL:

```json
"settings": {
  "apiKey": "phc_...",
  "host": "https://posthog.your-domain.com"
}
```

## Feature Flags

Pass `personalApiKey` for local feature flag evaluation. Flag evaluation is not
a destination concern; it is exposed via the SDK client instance.

## Web Destination

For browser-side PostHog integration, see
[@walkeros/web-destination-posthog](https://www.npmjs.com/package/@walkeros/web-destination-posthog).

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
