<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Meta Pixel Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/meta)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-meta)

This package provides a Meta Pixel (formerly Facebook Pixel) destination for
walkerOS. It sends events to Meta Pixel to track visitor activity and
conversions for Facebook and Instagram advertising campaigns.

walkerOS follows a **source → collector → destination** architecture. This Meta
Pixel destination receives processed events from the walkerOS collector and
transforms them into Meta's Pixel API format, handling conversion events, custom
events, and audience building data to optimize your Meta advertising campaigns.

## Installation

```sh
npm install @walkeros/web-destination-meta
```

## Quick Start

Configure in your Flow JSON:

```json
{
  "version": 1,
  "flows": {
    "default": {
      "web": {},
      "destinations": {
        "meta": {
          "package": "@walkeros/web-destination-meta",
          "config": {
            "settings": { "pixelId": "1234567890" },
            "loadScript": true
          }
        }
      }
    }
  }
}
```

Or programmatically:

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationMeta } from '@walkeros/web-destination-meta';

const { elb } = await startFlow({
  destinations: [
    {
      destination: destinationMeta,
      config: {
        settings: { pixelId: '1234567890' },
        loadScript: true,
      },
    },
  ],
});
```

## Configuration

| Name         | Type      | Description                                                       | Required | Example        |
| ------------ | --------- | ----------------------------------------------------------------- | -------- | -------------- |
| `pixelId`    | `string`  | Your Meta Pixel ID from Facebook Business Manager                 | Yes      | `'1234567890'` |
| `loadScript` | `boolean` | Whether to automatically load the Meta Pixel script (fbevents.js) | No       | `true`         |

## Type Definitions

See [src/types/](./src/types/) for TypeScript interfaces.

## Related

- [Website Documentation](https://www.walkeros.io/docs/destinations/web/meta/)
- [Destination Interface](../../../core/src/types/destination.ts)

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
