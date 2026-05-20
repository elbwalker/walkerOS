<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/destination-demo

A demo destination that logs walkerOS events to the console with optional field
filtering, for debugging, testing, and demonstrations.

[Documentation](https://www.walkeros.io/docs/destinations) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/destination-demo) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/destinations/demo)

## Installation

```bash
npm install @walkeros/destination-demo
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { destinationDemo } from '@walkeros/destination-demo';

const { collector } = await startFlow({
  destinations: {
    demo: destinationDemo,
  },
});

await collector.push('page view', { title: 'Home' });
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
