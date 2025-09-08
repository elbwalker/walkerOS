<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
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

## Usage

Here's a basic example of how to use the Meta Pixel destination:

```typescript
import { createCollector } from '@walkeros/collector';
import { destinationMeta } from '@walkeros/web-destination-meta';

const { elb } = await createCollector();

elb('walker destination', destinationMeta, {
  settings: {
    pixelId: '1234567890', // Your Meta Pixel ID
  },
  loadScript: true, // Load Meta Pixel script automatically
});
```

## Configuration

| Name         | Type      | Description                                                       | Required | Example        |
| ------------ | --------- | ----------------------------------------------------------------- | -------- | -------------- |
| `pixelId`    | `string`  | Your Meta Pixel ID from Facebook Business Manager                 | Yes      | `'1234567890'` |
| `loadScript` | `boolean` | Whether to automatically load the Meta Pixel script (fbevents.js) | No       | `true`         |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
