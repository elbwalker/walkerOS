<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-usercentrics

Integrates Usercentrics consent management with walkerOS by listening for a
configured window event and mapping category or service consent state to
walkerOS consent groups.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/usercentrics)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-usercentrics)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/usercentrics)

## Installation

```bash
npm install @walkeros/web-source-cmp-usercentrics
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceUsercentrics } from '@walkeros/web-source-cmp-usercentrics';

await startFlow({
  sources: {
    consent: {
      code: sourceUsercentrics,
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/usercentrics**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
