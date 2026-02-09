<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Plausible Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/plausible)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-plausible)

This package provides a [Plausible Analytics](https://plausible.io/) destination
for walkerOS. Plausible is a simple, and privacy-friendly Google Analytics
Alternative.

walkerOS follows a **source → collector → destination** architecture. This
Plausible destination receives processed events from the walkerOS collector and
transforms them into Plausible Analytics format, providing lightweight,
privacy-focused web analytics without cookies or personal data collection.

## Installation

```sh
npm install @walkeros/web-destination-plausible
```

## Usage

Here's a basic example of how to use the Plausible destination:

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationPlausible } from '@walkeros/web-destination-plausible';

await startFlow({
  destinations: {
    plausible: {
      code: destinationPlausible,
      config: {
        settings: {
          domain: 'walkeros.io', // Optional, domain of your site as registered
        },
      },
    },
  },
});
```

## Configuration

| Name     | Type     | Description                                        | Required | Example         |
| -------- | -------- | -------------------------------------------------- | -------- | --------------- |
| `domain` | `string` | The domain of your site as registered in Plausible | No       | `'walkeros.io'` |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
