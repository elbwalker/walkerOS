<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-cookiefirst

Integrates CookieFirst consent management with walkerOS by listening for
CookieFirst events and translating consent categories to walkerOS consent
groups.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/cookiefirst)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-cookiefirst)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/cookiefirst)

## Installation

```bash
npm install @walkeros/web-source-cmp-cookiefirst
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceCookieFirst } from '@walkeros/web-source-cmp-cookiefirst';

await startFlow({
  sources: {
    consent: {
      code: sourceCookieFirst,
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/cookiefirst**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
