<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-cookiebot

Integrates Cookiebot consent management with walkerOS by mapping Cookiebot's
categories `preferences`, `statistics` and `marketing` to walkerOS consent
groups. Strictly necessary cookies are reported as `necessary`.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/cookiebot) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-cookiebot)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/cookiebot)

## Installation

```bash
npm install @walkeros/web-source-cmp-cookiebot
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceCookiebot } from '@walkeros/web-source-cmp-cookiebot';

await startFlow({
  sources: {
    consent: {
      code: sourceCookiebot,
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/cookiebot**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
