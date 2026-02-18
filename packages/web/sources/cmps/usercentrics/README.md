# @walkeros/web-source-cmp-usercentrics

Usercentrics consent management source for walkerOS.

This source listens to [Usercentrics](https://usercentrics.com/) CMP events and
translates consent states to walkerOS consent commands.

## Installation

```bash
npm install @walkeros/web-source-cmp-usercentrics
```

## Usage

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceUsercentrics } from '@walkeros/web-source-cmp-usercentrics';
// import { destinationGtag } from '@walkeros/web-destination-gtag';

await startFlow({
  sources: {
    consent: {
      code: sourceUsercentrics,
    },
  },
  destinations: {
    gtag: {
      code: destinationGtag,
      config: {
        consent: { marketing: true }, // Requires marketing consent
      },
    },
  },
});
```

## Configuration

### Settings

| Setting        | Type                     | Default     | Description                                             |
| -------------- | ------------------------ | ----------- | ------------------------------------------------------- |
| `eventName`    | `string`                 | `'ucEvent'` | Window event name configured in Usercentrics admin      |
| `categoryMap`  | `Record<string, string>` | `{}`        | Maps Usercentrics categories to walkerOS consent groups |
| `explicitOnly` | `boolean`                | `true`      | Only process explicit consent (user made a choice)      |

### Usercentrics setup

Configure a **Window Event** in your Usercentrics admin: Implementation > Data
Layer & Events > Window Event Name (e.g., `ucEvent`).

Alternatively, set `eventName: 'UC_SDK_EVENT'` to use the built-in Browser SDK
event (no admin configuration required).

### Custom mapping example

```typescript
await startFlow({
  sources: {
    consent: {
      code: sourceUsercentrics,
      config: {
        settings: {
          eventName: 'ucEvent',
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
            marketing: 'marketing',
          },
          explicitOnly: true,
        },
      },
    },
  },
});
```

## How it works

1. **Event listener**: Registers a listener for the configured window event
   (default: `ucEvent`).

2. **Group vs. service detection**: When the event fires, checks if `ucCategory`
   values are all booleans:
   - **Group-level**: Uses `ucCategory` as consent state (maps categories via
     `categoryMap`)
   - **Service-level**: Extracts individual service booleans from `event.detail`
     (normalized to `lowercase_underscores`) and applies `categoryMap` to
     boolean `ucCategory` entries

3. **Explicit filtering**: By default, only processes events where
   `type === 'explicit'` (user actively made a choice). Set
   `explicitOnly: false` to also process implicit/default consent.

4. **Consent command**: Calls `elb('walker consent', state)` with the mapped
   consent state.

### Timing considerations

The source should be initialized before the Usercentrics script loads to avoid
missing the initial consent event. When using `explicitOnly: true` (default),
this is not a concern since the implicit init event is filtered anyway. For
`explicitOnly: false`, ensure the consent source has no `require` constraints so
it initializes immediately.

## Usercentrics event reference

The source listens for `CustomEvent` with this `detail` structure:

```typescript
{
  event: 'consent_status',
  type: 'explicit' | 'implicit',
  action: 'onAcceptAllServices' | 'onDenyAllServices' | 'onUpdateServices',
  ucCategory: { marketing: true, functional: false, ... },
  'Google Analytics': true,
  'Facebook Pixel': false,
  ...
}
```

- [Usercentrics Custom Events Documentation](https://support.usercentrics.com/hc/en-us/articles/17104002464668-How-can-I-create-a-custom-event)

## walkerOS.json

```json
{ "walkerOS": { "type": "source", "platform": "web" } }
```

## Type definitions

See [src/types/index.ts](./src/types/index.ts) for TypeScript interfaces.

## Related

- [Consent management guide](https://www.walkeros.io/docs/guides/consent)
- [Usercentrics Documentation](https://www.walkeros.io/docs/sources/web/cmps/usercentrics)

## License

MIT
