<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/collector

The central processing engine of walkerOS that receives events from sources,
enriches them, applies consent rules, and routes them to destinations.

[Documentation](https://www.walkeros.io/docs/collector) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/collector) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/collector)

## Installation

```bash
npm install @walkeros/collector
```

## Quick start

Start a flow with sources and destinations:

```ts
import { startFlow } from '@walkeros/collector';

const { collector, elb } = await startFlow({
  consent: { functional: true },
  sources: {
    // add your event sources
  },
  destinations: {
    // add your event destinations
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/collector**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
