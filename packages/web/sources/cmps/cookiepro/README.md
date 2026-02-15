# @walkeros/web-source-cmp-cookiepro

CookiePro/OneTrust consent management source for walkerOS.

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/cookiepro)
|
[Documentation](https://www.elbwalker.com/docs/guides/consent/examples/cookiepro)

This source listens to
[CookiePro/OneTrust](https://www.onetrust.com/products/cookie-consent/) CMP
events and translates consent states to walkerOS consent commands.

## Installation

```bash
npm install @walkeros/web-source-cmp-cookiepro
```

## Usage

```typescript
import { createCollector } from '@walkeros/collector';
import { sourceCookiePro } from '@walkeros/web-source-cmp-cookiepro';
// import { destinationGtag } from '@walkeros/web-destination-gtag';

const collector = createCollector({
  sources: {
    consent: {
      code: sourceCookiePro,
    },
  },
  destinations: {
    gtag: {
      code: destinationGtag,
      config: {
        consent: { analytics: true }, // Requires analytics consent
      },
    },
  },
});
```

## Configuration

### Settings

| Setting        | Type                     | Default      | Description                                        |
| -------------- | ------------------------ | ------------ | -------------------------------------------------- |
| `categoryMap`  | `Record<string, string>` | See below    | Maps CookiePro category IDs to walkerOS groups     |
| `explicitOnly` | `boolean`                | `true`       | Only process explicit consent (user made a choice) |
| `globalName`   | `string`                 | `'OneTrust'` | Custom name for `window.OneTrust` object           |

### Default category mapping

```typescript
{
  C0001: 'functional',  // Strictly Necessary
  C0002: 'analytics',   // Performance
  C0003: 'functional',  // Functional
  C0004: 'marketing',   // Targeting
  C0005: 'marketing',   // Social Media
}
```

Category ID comparison is case-insensitive. Unmapped category IDs are ignored
(not passed through), since CookiePro's opaque IDs are meaningless without a
mapping. All mapped walkerOS groups receive explicit `true`/`false` values --
absent groups are set to `false` so destinations know which consent is denied.

### Custom mapping example

```typescript
import { createCollector } from '@walkeros/collector';
import { sourceCookiePro } from '@walkeros/web-source-cmp-cookiepro';

const collector = createCollector({
  sources: {
    consent: {
      code: sourceCookiePro,
      config: {
        settings: {
          categoryMap: {
            C0002: 'statistics', // Use 'statistics' instead of 'analytics'
          },
          explicitOnly: true,
        },
      },
    },
  },
});
```

Custom entries are merged with the default mapping. Specify only the categories
you want to override -- all other defaults remain active.

## How it works

1. **Already loaded**: When the source initializes, it checks if
   `window.OneTrust` and `window.OptanonActiveGroups` already exist. If so,
   processes consent immediately.

2. **OptanonWrapper**: If the SDK isn't loaded yet, wraps the global
   `OptanonWrapper` callback (preserving any existing wrapper). OneTrust calls
   this function on SDK init. The wrapper self-unwraps after the first call,
   leaving the event listener to handle subsequent changes.

3. **OneTrustGroupsUpdated event**: Listens for the `OneTrustGroupsUpdated`
   window event, which fires on every consent change.

4. **Parsing**: Splits the `OptanonActiveGroups` comma-separated string, maps
   category IDs through `categoryMap`, and calls `elb('walker consent', state)`.
   Sets explicit `false` for all mapped groups that are not in the active list.

### Timing considerations

The source handles all timing scenarios:

- **SDK loads before source:** The "already loaded" check reads existing consent
  from `OptanonActiveGroups` immediately. The `OneTrustGroupsUpdated` listener
  catches future changes.
- **Source loads before SDK:** The `OptanonWrapper` wrapping intercepts the
  SDK's init callback. The event listener catches subsequent changes.
- **`explicitOnly` (default):** Uses `OneTrust.IsAlertBoxClosed()` to determine
  if the user has actively interacted with the consent banner. Implicit/default
  consent is ignored.

### OptanonWrapper wrapping

The `OptanonWrapper` function-reassignment pattern is the standard OneTrust
integration approach. Multiple scripts can wrap it in a chain (each preserving
the previous). On `destroy()`, the source restores the wrapper it captured at
init time. If another script wraps `OptanonWrapper` after this source, that
wrapper will be lost on destroy. This is inherent to the pattern.

## CookiePro API reference

- `window.OptanonActiveGroups`: Comma-separated string of active category IDs
  (e.g., `",C0001,C0003,"`)
- `window.OneTrust.IsAlertBoxClosed()`: Returns `true` if user made explicit
  choice
- `window.OptanonWrapper()`: Global callback invoked by SDK on load and consent
  changes
- `OneTrustGroupsUpdated`: Window event fired on consent changes (event.detail
  is an array of active group IDs)

## walkerOS.json

```json
{ "walkerOS": { "type": "source", "platform": "web" } }
```

## Type definitions

See [src/types/index.ts](./src/types/index.ts) for TypeScript interfaces.

## Related

- [Consent management guide](https://www.elbwalker.com/docs/guides/consent)
- [CookiePro integration guide](https://www.elbwalker.com/docs/guides/consent/examples/cookiepro)

## License

MIT
