# @walkeros/web-source-cmp-cookiefirst

CookieFirst consent management source for walkerOS.

This source listens to [CookieFirst](https://cookiefirst.com/) CMP events and
translates consent states to walkerOS consent commands.

## Installation

```bash
npm install @walkeros/web-source-cmp-cookiefirst
```

## Usage

```typescript
import { createCollector } from '@walkeros/collector';
import { sourceCookieFirst } from '@walkeros/web-source-cmp-cookiefirst';

const collector = createCollector({
  sources: {
    consent: {
      code: sourceCookieFirst,
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

| Setting        | Type                     | Default         | Description                                            |
| -------------- | ------------------------ | --------------- | ------------------------------------------------------ |
| `categoryMap`  | `Record<string, string>` | See below       | Maps CookieFirst categories to walkerOS consent groups |
| `explicitOnly` | `boolean`                | `true`          | Only process explicit consent (user made a choice)     |
| `globalName`   | `string`                 | `'CookieFirst'` | Custom name for `window.CookieFirst` object            |

### Default Category Mapping

```typescript
{
  necessary: 'functional',
  functional: 'functional',
  performance: 'analytics',
  advertising: 'marketing',
}
```

When multiple CookieFirst categories map to the same walkerOS group (e.g., both
`necessary` and `functional` → `functional`), the source uses OR logic: if ANY
source category is `true`, the target group is `true`.

### Custom Mapping Example

```typescript
const collector = createCollector({
  sources: {
    consent: {
      code: sourceCookieFirst,
      config: {
        settings: {
          categoryMap: {
            performance: 'statistics', // Use 'statistics' instead of 'analytics'
          },
          explicitOnly: true,
        },
      },
    },
  },
});
```

## How It Works

1. **Initialization**: When the source loads, it checks if CookieFirst is
   already initialized and processes any existing consent state.

2. **cf_init Event**: Listens for the `cf_init` event fired when CookieFirst
   banner initializes.

3. **cf_consent Event**: Listens for the `cf_consent` event fired when user
   changes their consent preferences.

4. **Consent Mapping**: Translates CookieFirst categories to walkerOS consent
   groups and calls `elb('walker consent', state)`.

## CookieFirst API Reference

- [CookieFirst Public API Documentation](https://support.cookiefirst.com/hc/en-us/articles/360011568738-Cookie-Banner-Public-API-documentation)

## License

MIT
