<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-cookiepro

Integrates CookiePro/OneTrust consent management with walkerOS by mapping
CookiePro category IDs to walkerOS consent groups.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/cookiepro) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-cookiepro)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/cookiepro)

## Installation

```bash
npm install @walkeros/web-source-cmp-cookiepro
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceCookiePro } from '@walkeros/web-source-cmp-cookiepro';

await startFlow({
  sources: {
    consent: {
      code: sourceCookiePro,
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/cookiepro**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
